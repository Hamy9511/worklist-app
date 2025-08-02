import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const studyId = searchParams.get('studyId')
  const patientId = searchParams.get('patientId')

  if (!studyId || !patientId) {
    return NextResponse.json(
      { error: 'Se requieren ambos IDs: estudio y paciente' },
      { status: 400 }
    )
  }

  const ORTHANC_URL = process.env.ORTHANC_URL || "http://192.168.2.132:8042"
  const ORTHANC_USERNAME = process.env.ORTHANC_USERNAME || "hamservice"
  const ORTHANC_PASSWORD = process.env.ORTHANC_PASSWORD || "Sop0rt3IT"

  const headers: HeadersInit = {
    'Accept': 'application/zip'
  }

  if (ORTHANC_USERNAME && ORTHANC_PASSWORD) {
    headers['Authorization'] = `Basic ${Buffer.from(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`).toString('base64')}`
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 300000)

    const orthancRes = await fetch(`${ORTHANC_URL}/studies/${studyId}/archive`, {
      method: 'GET',
      headers,
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!orthancRes.ok) {
      return NextResponse.json({ error: 'No se pudo descargar el estudio' }, { status: 500 })
    }

    const blob = await orthancRes.blob()
    const safePatientId = patientId.replace(/[^a-zA-Z0-9-_]/g, "_")
    const responseHeaders = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="paciente-${safePatientId}-estudio.zip"`,
      'Content-Length': blob.size.toString()
    })

    return new NextResponse(blob, {
      status: 200,
      headers: responseHeaders
    })
  } catch (error) {
    console.error("Error al descargar estudio:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Error al conectar con Orthanc" 
    }, { status: 500 })
  }
}