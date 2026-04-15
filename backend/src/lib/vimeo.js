import Vimeo from '@vimeo/vimeo'

const { Vimeo: VimeoClient } = Vimeo

const client = new VimeoClient(
  process.env.VIMEO_CLIENT_ID,
  process.env.VIMEO_CLIENT_SECRET
)

// Get access token using client credentials
let accessToken = null

export async function getAccessToken() {
  if (accessToken) return accessToken

  return new Promise((resolve, reject) => {
    client.clientCredentials(['public', 'create', 'edit', 'upload'], (err, token) => {
      if (err) {
        reject(err)
        return
      }
      accessToken = token.access_token
      client.setAccessToken(accessToken)
      resolve(accessToken)
    })
  })
}

export async function uploadVideoToVimeo(filePath, name, description = '') {
  await getAccessToken()

  return new Promise((resolve, reject) => {
    client.upload(
      filePath,
      {
        name: name || 'FKVI Profilvideo',
        description: description,
        privacy: { view: 'unlisted' },
      },
      (uri) => {
        // Upload complete - get video data
        client.request({ method: 'GET', path: uri }, (err, body) => {
          if (err) {
            reject(err)
            return
          }
          const videoId = uri.replace('/videos/', '')
          const embedUrl = `https://player.vimeo.com/video/${videoId}`
          const videoUrl = `https://vimeo.com/${videoId}`
          resolve({ uri, videoId, embedUrl, videoUrl, body })
        })
      },
      (bytesUploaded, bytesTotal) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100)
        console.log(`Vimeo upload: ${percentage}%`)
      },
      (err) => {
        reject(err)
      }
    )
  })
}
