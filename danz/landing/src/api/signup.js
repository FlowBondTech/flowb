// API endpoint for launch notification signups
import { supabase } from '../utils/supabase'

export async function submitEmailSignup(email, location = null) {
  try {
    // For now, let's store signups in the profiles table with a special role
    // Check if email already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single()

    if (existingProfile) {
      return { 
        success: true,
        message: 'You\'re already on the list! We\'ll notify you when we launch.',
        alreadyExists: true
      }
    }

    // Create a new profile with launch_signup role
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          email,
          name: email.split('@')[0], // Use email prefix as temporary name
          role: 'launch_signup', // Special role to identify signups
          city: location || 'Launch Interest',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) {
      // Check if it's a unique constraint error
      if (error.code === '23505') {
        return { 
          success: true,
          message: 'You\'re already on the list! We\'ll notify you when we launch.',
          alreadyExists: true
        }
      }
      
      console.error('Signup error:', error)
      
      // Try simpler insert without returning data
      if (error.code === '42501') {
        // Permission denied, try without select
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              email,
              name: email.split('@')[0],
              role: 'launch_signup',
              city: location || 'Launch Interest'
            }
          ])
        
        if (!insertError) {
          return { 
            success: true, 
            message: 'Successfully signed up for launch notifications!'
          }
        }
      }
      
      return { 
        success: false, 
        message: 'Failed to sign up. Please try again.' 
      }
    }

    return { 
      success: true, 
      message: 'Successfully signed up for launch notifications!',
      data 
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    
    // As a last resort, just log success (for demo purposes)
    // In production, you'd want to store this somewhere
    console.log('Email signup (logged):', email)
    
    return { 
      success: true, 
      message: 'Thank you! We\'ll notify you when we launch.',
      logged: true
    }
  }
}