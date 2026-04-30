import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { validateEnv, PORT, FRONTEND_ORIGIN } from './config/env'
import gradesRouter from './routes/grades'
import modulesRouter from './routes/modules'
import unitsRouter from './routes/units'
import adminResourcesRouter from './routes/adminResources'
import resourcesRouter from './routes/resources'
import teachersRouter from './routes/teachers'

dotenv.config()
validateEnv()

const app = express()

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  }),
)
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/grades', gradesRouter)
app.use('/api/modules', modulesRouter)
app.use('/api/units', unitsRouter)
app.use('/api/admin/resources', adminResourcesRouter)
app.use('/api/resources', resourcesRouter)
app.use('/api/teachers', teachersRouter)

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`)
})
