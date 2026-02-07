import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// Verify admin session
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  
  const session = authHeader.substring(7);
  return session.length > 10;
}

export async function POST(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, confirmCode } = await request.json();
    const supabase = getSupabase();

    // Require confirmation code for destructive actions
    if (confirmCode !== 'CONFIRM') {
      return NextResponse.json({ error: 'Invalid confirmation code' }, { status: 400 });
    }

    let result = { success: false, message: '', affected: 0 };

    switch (action) {
      case 'clear_messages': {
        // First count, then delete
        const { count } = await supabase
          .from('story_message_history')
          .select('*', { count: 'exact', head: true });
        
        const { error } = await supabase
          .from('story_message_history')
          .delete()
          .not('id', 'is', null); // Delete all rows
        
        if (error) throw error;
        result = { success: true, message: 'All messages cleared', affected: count || 0 };
        break;
      }

      case 'clear_expired_messages': {
        const { count } = await supabase
          .from('story_message_history')
          .select('*', { count: 'exact', head: true })
          .eq('is_expired', true);
        
        const { error } = await supabase
          .from('story_message_history')
          .delete()
          .eq('is_expired', true);
        
        if (error) throw error;
        result = { success: true, message: 'Expired messages cleared', affected: count || 0 };
        break;
      }

      case 'clear_login_logs': {
        const { count } = await supabase
          .from('story_login_logs')
          .select('*', { count: 'exact', head: true });
        
        const { error } = await supabase
          .from('story_login_logs')
          .delete()
          .not('id', 'is', null);
        
        if (error) throw error;
        result = { success: true, message: 'Login logs cleared', affected: count || 0 };
        break;
      }

      case 'clear_vault': {
        // Get all vault files first
        const { data: files } = await supabase
          .from('story_vault')
          .select('storage_path');
        
        // Delete from storage
        if (files && files.length > 0) {
          const paths = files.map(f => f.storage_path).filter(Boolean);
          if (paths.length > 0) {
            await supabase.storage.from('story-vault').remove(paths);
          }
        }
        
        // Delete from database
        const { error } = await supabase
          .from('story_vault')
          .delete()
          .not('id', 'is', null);
        
        if (error) throw error;
        result = { success: true, message: 'Vault cleared', affected: files?.length || 0 };
        break;
      }

      case 'reset_user_sessions': {
        const { count } = await supabase
          .from('story_users')
          .select('*', { count: 'exact', head: true });
        
        const { error } = await supabase
          .from('story_users')
          .update({ last_login: null })
          .not('id', 'is', null);
        
        if (error) throw error;
        result = { success: true, message: 'User sessions reset', affected: count || 0 };
        break;
      }

      case 'delete_all_users': {
        const { count } = await supabase
          .from('story_users')
          .select('*', { count: 'exact', head: true });
        
        const { error } = await supabase
          .from('story_users')
          .delete()
          .not('id', 'is', null);
        
        if (error) throw error;
        result = { success: true, message: 'All users deleted', affected: count || 0 };
        break;
      }

      case 'clear_all_media': {
        const { count } = await supabase
          .from('story_message_history')
          .select('*', { count: 'exact', head: true })
          .not('media_url', 'is', null);
        
        const { error } = await supabase
          .from('story_message_history')
          .update({ media_url: null, media_filename: null })
          .not('media_url', 'is', null);
        
        if (error) throw error;
        result = { success: true, message: 'All media cleared from messages', affected: count || 0 };
        break;
      }

      case 'factory_reset': {
        // Nuclear option - clear everything
        await supabase.from('story_message_history').delete().not('id', 'is', null);
        await supabase.from('story_login_logs').delete().not('id', 'is', null);
        await supabase.from('story_vault').delete().not('id', 'is', null);
        await supabase.from('story_users').delete().not('id', 'is', null);
        
        result = { success: true, message: 'Factory reset complete - all data cleared', affected: 0 };
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('[System Controls] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Operation failed' 
    }, { status: 500 });
  }
}

// GET endpoint to fetch system stats
export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    const [messages, users, logs, vault] = await Promise.all([
      supabase.from('story_message_history').select('*', { count: 'exact', head: true }),
      supabase.from('story_users').select('*', { count: 'exact', head: true }),
      supabase.from('story_login_logs').select('*', { count: 'exact', head: true }),
      supabase.from('story_vault').select('*', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      stats: {
        messages: messages.count || 0,
        users: users.count || 0,
        loginLogs: logs.count || 0,
        vaultFiles: vault.count || 0,
      }
    });

  } catch (error) {
    console.error('[System Controls] Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

