import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import profilesRouter from './routes/profiles.js'
import companiesRouter from './routes/companies.js'
import adminRouter from './routes/admin.js'
import vimeoRouter from './routes/vimeo.js'
import authMiddleware from './middleware/auth.js'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 })
app.use(limiter)

// Attach io to requests
app.use((req, _res, next) => {
  req.io = io
  next()
})

// Routes
app.use('/api/profiles', profilesRouter)
app.use('/api/companies', companiesRouter)
app.use('/api/admin', authMiddleware, adminRouter)
app.use('/api/vimeo', authMiddleware, vimeoRouter)

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join-company', (companyId) => {
    socket.join(`company-${companyId}`)
  })

  socket.on('join-admin', () => {
    socket.join('admin-room')
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`FKVI Backend läuft auf Port ${PORT}`)
})

export { io }
