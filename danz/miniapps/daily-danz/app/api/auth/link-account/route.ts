import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/link-account
 *
 * Directly links an account to the current user (same-app linking).
 * Used when linking within the same app without cross-app token flow.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetProvider, targetProviderId, targetMetadata, linkingToken } = body

    if (!targetProvider) {
      return NextResponse.json(
        { error: 'targetProvider is required' },
        { status: 400 }
      )
    }

    if (!targetProviderId) {
      return NextResponse.json(
        { error: 'targetProviderId is required' },
        { status: 400 }
      )
    }

    // TODO: Get current user from session
    // const currentUser = await getCurrentUser(request)
    // if (!currentUser) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // TODO: If linkingToken provided, validate it
    // if (linkingToken) {
    //   const validToken = await validateToken(linkingToken)
    //   if (!validToken) {
    //     return NextResponse.json({ error: 'Invalid linking token' }, { status: 400 })
    //   }
    // }

    // TODO: Check if target provider is already linked to another user
    // const existingLink = await db.query.userAuthProviders.findFirst({
    //   where: and(
    //     eq(userAuthProviders.provider, targetProvider),
    //     eq(userAuthProviders.providerId, targetProviderId)
    //   )
    // })
    //
    // if (existingLink && existingLink.userId !== currentUser.id) {
    //   return NextResponse.json(
    //     { error: 'This account is already linked to another user' },
    //     { status: 409 }
    //   )
    // }

    // TODO: Create the link
    // await db.insert(userAuthProviders).values({
    //   userId: currentUser.id,
    //   provider: targetProvider,
    //   providerId: targetProviderId,
    //   metadata: targetMetadata,
    // })

    // TODO: Award XP bonus
    // const bonusXp = await awardLinkingBonus(currentUser.id, targetProvider)

    // TODO: Fetch updated user
    // const updatedUser = await getFullUser(currentUser.id)

    return NextResponse.json({
      success: true,
      message: 'Account linking - implement with database',
      bonusXp: 500,
      // user: updatedUser,
    })
  } catch (error) {
    console.error('Failed to link account:', error)
    return NextResponse.json(
      { error: 'Failed to link account' },
      { status: 500 }
    )
  }
}
