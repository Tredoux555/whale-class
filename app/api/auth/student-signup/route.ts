import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      childFirstName,
      childLastName,
      childDOB,
      parentName,
      parentEmail,
      parentPhone,
      password,
      avatarEmoji,
      linkCode,
    } = body;

    // Validation
    if (!childFirstName || !childLastName || !childDOB || !parentName || !parentEmail || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(parentEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // If link code provided, verify it exists
    let existingChildId = null;
    if (linkCode) {
      const childResult = await db.query(
        'SELECT id, name FROM children WHERE link_code = $1 AND active_status = true',
        [linkCode.toUpperCase()]
      );

      if (childResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Invalid link code. Please check with your admin.' },
          { status: 400 }
        );
      }

      existingChildId = childResult.rows[0].id;
    }

    // Check for duplicate signup
    const duplicateCheck = await db.query(
      `SELECT id FROM parent_signups 
       WHERE parent_email = $1 
       AND child_first_name = $2 
       AND child_last_name = $3 
       AND status = 'pending'`,
      [parentEmail, childFirstName, childLastName]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'A signup request with these details is already pending approval' },
        { status: 400 }
      );
    }

    // Insert signup request
    const result = await db.query(
      `INSERT INTO parent_signups (
        child_first_name,
        child_last_name,
        child_date_of_birth,
        parent_name,
        parent_email,
        parent_phone,
        login_password,
        avatar_emoji,
        existing_child_id,
        link_code,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
      RETURNING id`,
      [
        childFirstName,
        childLastName,
        childDOB,
        parentName,
        parentEmail,
        parentPhone || null,
        hashedPassword,
        avatarEmoji || '🐋',
        existingChildId,
        linkCode ? linkCode.toUpperCase() : null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Signup request submitted successfully. You will receive an email once approved.',
      signupId: result.rows[0].id,
    });
  } catch (error: any) {
    console.error('Student signup error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A signup request with these details already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit signup request' },
      { status: 500 }
    );
  }
}

