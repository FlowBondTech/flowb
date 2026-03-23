import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/unlink-account
 *
 * Unlinks an account from the current user.
 * Cannot unlink the primary provider.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider } = body

    if (!provider) {
      return NextResponse.json(
        { error: 'provider is required' },
        { status: 400 }
      )
    }

    // TODO: Get current user from session
    // const currentUser = await getCurrentUser(request)
    // if (!currentUser) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // TODO: Check if this is the primary provider
    // const authProvider = await db.query.userAuthProviders.findFirst({
    //   where: and(
    //     eq(userAuthProviders.userId, currentUser.id),
    //     eq(userAuthProviders.provider, provider)
    //   )
    // })
    //
    // if (!authProvider) {
    //   return NextResponse.json(
    //     { error: 'Provider not linked' },
    //     { status: 404 }
    //   )
    // }
    //
    // if (authProvider.isPrimary) {
    //   return NextResponse.json(
    //     { error: 'Cannot unlink primary provider' },
    //     { status: 400 }
    //   )
    // }

    // TODO: Check user has at least one other provider
    // const providerCount = await db.query.userAuthProviders.count({
    //   where: eq(userAuthProviders.userId, currentUser.id)
    // })
    //
    // if (providerCount <= 1) {
    //   return NextResponse.json(
    //     { error: 'Cannot unlink last provider' },
    //     { status: 400 }
    //   )
    // }

    // TODO: Delete the link
    // await db.delete(userAuthProviders).where(
    //   and(
    //     eq(userAuthProviders.userId, currentUser.id),
    //     eq(userAuthProviders.provider, provider)
    //   )
    // )

    return NextResponse.json({
      success: true,
      message: 'Account unlinking - implement with database',
    })
  } catch (error) {
    console.error('Failed to unlink account:', error)
    return NextResponse.json(
      { error: 'Failed to unlink account' },
      { status: 500 }
    )
  }
}
