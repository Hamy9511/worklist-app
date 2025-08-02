import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const ORTHANC_URL = process.env.ORTHANC_URL || "http://192.168.2.132:8042"
  const ORTHANC_USERNAME = process.env.ORTHANC_USERNAME || "hamservice"
  const ORTHANC_PASSWORD = process.env.ORTHANC_PASSWORD || "Sop0rt3IT"

  const headers: HeadersInit = {
    'Accept': 'application/json'
  }

  if (ORTHANC_USERNAME && ORTHANC_PASSWORD) {
    headers['Authorization'] = `Basic ${Buffer.from(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`).toString('base64')}`
  }

  try {
    const studiesRes = await fetch(`${ORTHANC_URL}/studies`, {
      method: 'GET',
      headers
    })

    if (!studiesRes.ok) {
      return NextResponse.json({ error: 'No se pudo obtener la lista de estudios' }, { status: 500 })
    }

    const studiesIds: string[] = await studiesRes.json()
    const studyDataArray: any[] = []

    for (const studyId of studiesIds.slice(0, 20)) {
      try {
        const studyRes = await fetch(`${ORTHANC_URL}/studies/${studyId}`, { headers })
        if (!studyRes.ok) continue
        const study = await studyRes.json()

        studyDataArray.push({
          id: study.PatientMainDicomTags.PatientID || study.ID,
          name: study.PatientMainDicomTags.PatientName || "Nombre no disponible",
          age: calculateAge(study.PatientMainDicomTags.PatientBirthDate || ""),
          study: study.MainDicomTags.StudyDescription || "Estudio no especificado",
          studyDate: formatDate(study.MainDicomTags.StudyDate || ""),
          AccessionNumber: study.MainDicomTags.AccessionNumber || " No especificada",
          orthancStudyId: study.ID
        })
      } catch (e) {
        continue
      }
    }

    return NextResponse.json(studyDataArray)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error en el servidor al conectar con Orthanc" }, { status: 500 })
  }
}

function calculateAge(birthDate: string): number {
  if (!birthDate || birthDate.length < 8) return 0

  try {
    const birthYear = parseInt(birthDate.substring(0, 4))
    const birthMonth = parseInt(birthDate.substring(4, 6))
    const birthDay = parseInt(birthDate.substring(6, 8))

    const today = new Date()
    let age = today.getFullYear() - birthYear
    if (today.getMonth() + 1 < birthMonth || (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)) {
      age--
    }

    return age
  } catch {
    return 0
  }
}

function formatDate(dicomDate: string): string {
  if (!dicomDate || dicomDate.length !== 8) return 'Fecha no disponible'
  const year = dicomDate.slice(0, 4)
  const month = dicomDate.slice(4, 6)
  const day = dicomDate.slice(6, 8)
  return `${day}/${month}/${year}`
}