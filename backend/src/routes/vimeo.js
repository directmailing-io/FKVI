import express from 'express'
import multer from 'multer'
import { uploadVideoToVimeo } from '../lib/vimeo.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { unlinkSync } from 'fs'

const router = express.Router()
const upload = multer({ dest: '/tmp/', limits: { fileSize: 500 * 1024 * 1024 } }) // 500MB

router.post('/upload/:profileId', upload.single('video'), async (req, res) => {
  const { profileId } = req.params
  const file = req.file

  if (!file) {
    return res.status(400).json({ error: 'Keine Videodatei' })
  }

  // Check admin
  const { data: adminData } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('user_id', req.user.id)
    .single()

  if (!adminData) {
    try { unlinkSync(file.path) } catch {}
    return res.status(403).json({ error: 'Nur Admins können Videos hochladen' })
  }

  try {
    const { embedUrl, videoUrl, videoId } = await uploadVideoToVimeo(
      file.path,
      `FKVI Profilvideo ${profileId}`,
      'Vorstellungsvideo einer FKVI-Fachkraft'
    )

    // Update profile
    await supabaseAdmin
      .from('profiles')
      .update({ vimeo_video_url: embedUrl, vimeo_video_id: videoId })
      .eq('id', profileId)

    try { unlinkSync(file.path) } catch {}

    res.json({ success: true, embedUrl, videoUrl, videoId })
  } catch (err) {
    try { unlinkSync(file.path) } catch {}
    console.error('Vimeo upload error:', err)
    res.status(500).json({ error: 'Video-Upload fehlgeschlagen', details: err.message })
  }
})

export default router
