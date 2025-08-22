export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { tokens, title, body: messageBody, data } = body

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tokens array is required'
      })
    }

    if (!title || !messageBody) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Title and body are required'
      })
    }

    // Tạm thời chỉ log để test
    console.log('FCM notification would be sent:', {
      tokens: tokens.length,
      title,
      body: messageBody,
      data
    })

    // TODO: Implement actual FCM sending with Firebase Admin SDK
    // Hiện tại chỉ log để test logic

    return {
      success: true,
      sent: tokens.length,
      failed: 0,
      total: tokens.length,
      message: 'FCM logged successfully (not actually sent)'
    }

  } catch (error) {
    console.error('Error in FCM API:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process FCM notification'
    })
  }
})
