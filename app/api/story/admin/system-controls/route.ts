import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Verify admin session
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  
  const session = authHeader.substring(7);
  // Simple session check - in production use proper JWT
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
        // Delete all messages from story_messages table
        const { data, error } = await supabase
          .from('story_messages')
          .delete()
          .neq('id', 0); // Delete all
        
        if (error) throw error;
        result = { success: true, message: 'All messages cleared', affected: data?.length || 0 };
        break;
      }

      case 'clear_expired_messages': {
        // Delete only expired messages
        const { data, error } = await supabase
          .from('story_messages')
          .delete()
          .eq('is_expired', true);
        
        if (error) throw error;
        result = { success: true, message: 'Expired messages cleared', affected: data?.length || 0 };
        break;
      }

      case 'clear_login_logs': {
        // Delete all login logs
        const { data, error } = await supabase
          .from('story_login_logs')
          .delete()
          .neq('id', 0);
        
        if (error) throw error;
        result = { success: true, message: 'Login logs cleared', affected: data?.length || 0 };
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
        const { data, error } = await supabase
          .from('story_vault')
          .delete()
          .neq('id', 0);
        
        if (error) throw error;
        result = { success: true, message: 'Vault cleared', affected: files?.length || 0 };
        break;
      }

      case 'reset_user_sessions': {
        // Clear all user last_login timestamps to force re-login appearance
        const { data, error } = await supabase
          .from('story_users')
          .update({ last_login: null })
          .neq('id', 0);
        
        if (error) throw error;
        result = { success: true, message: 'User sessions reset', affected: data?.length || 0 };
        break;
      }

      case 'delete_all_users': {
        // Delete all users (dangerous!)
        const { data, error } = await supabase
          .from('story_users')
          .delete()
          .neq('id', 0);
        
        if (error) throw error;
        result = { success: true, message: 'All users deleted', affected: data?.length || 0 };
        break;
      }

      case 'clear_all_media': {
        // Delete all media from story_messages storage
        const { data: messages } = await supabase
          .from('story_messages')
          .select('media_url')
          .not('media_url', 'is', null);
        
        // Clear media URLs from messages but keep text
        const { error } = await supabase
          .from('story_messages')
          .update({ media_url: null, media_filename: null })
          .not('media_url', 'is', null);
        
        if (error) throw error;
        result = { success: true, message: 'All media cleared from messages', affected: messages?.length || 0 };
        break;
      }

      case 'factory_reset': {
        // Nuclear option - clear everything
        await supabase.from('story_messages').delete().neq('id', 0);
        await supabase.from('story_login_logs').delete().neq('id', 0);
        await supabase.from('story_vault').delete().neq('id', 0);
        await supabase.from('story_users').delete().neq('id', 0);
        
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
      supabase.from('story_messages').select('id', { count: 'exact', head: true }),
      supabase.from('story_users').select('id', { count: 'exact', head: true }),
      supabase.from('story_login_logs').select('id', { count: 'exact', head: true }),
      supabase.from('story_vault').select('id', { count: 'exact', head: true }),
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
