"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, FileText, Download } from "lucide-react"

interface PatientStudy {
  id: string;
  name: string;
  age: number;
  study: string;
  studyDate: string; // Formato DD/MM/YYYY
  AccessionNumber: string;
  orthancStudyId?: string;
}

export default function RadiologyPatients() {
  const [searchTerm, setSearchTerm] = useState("")
  const [patients, setPatients] = useState<PatientStudy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch("/api/studies")
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Error al cargar datos")
          return
        }

        // Obtener fecha actual en formato DD/MM/YYYY
        const today = new Date()
        const day = String(today.getDate()).padStart(2, '0')
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const year = today.getFullYear()
        const todayFormatted = `${day}/${month}/${year}`

        // Filtrar solo estudios de hoy (comparando con DD/MM/YYYY)
        const todayStudies = data.filter((patient: PatientStudy) => 
          patient.studyDate === todayFormatted
        )

        setPatients(todayStudies)
      } catch (err) {
        setError("Error al conectar con el servidor")
        console.error("fetchPatients error:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPatients()
  }, [])

  const handleDownload = async (studyId: string, patientId: string) => {
    try {
      setDownloading(studyId)
      setError(null)
      
      const res = await fetch(`/api/download?studyId=${studyId}&patientId=${patientId}`)
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "No se pudo descargar el estudio")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paciente-${patientId}-estudio.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 60000)
    } catch (err) {
      console.error("Error al descargar:", err)
      setError(err instanceof Error ? err.message : "No se pudo descargar el estudio.")
    } finally {
      setDownloading(null)
    }
  }

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.study.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.AccessionNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Función para formatear la fecha de hoy en español
  const formatTodayDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }
    return new Date().toLocaleDateString('es-ES', options)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Lista de Trabajo - Radiología</h1>
          </div>
          <p className="text-gray-600">Estudios radiológicos del {formatTodayDate()}</p>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, ID o estudio..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Cargando estudios...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No hay estudios para hoy</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Paciente</TableHead>
                    <TableHead>N° Acceso</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Estudio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descargar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={`${patient.id}-${patient.orthancStudyId}`}>
                      <TableCell>{patient.id}</TableCell>
                      <TableCell>{patient.AccessionNumber}</TableCell>
                      <TableCell>{patient.name}</TableCell>
                      <TableCell>{patient.age} años</TableCell>
                      <TableCell>{patient.study}</TableCell>
                      <TableCell>{patient.studyDate}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => patient.orthancStudyId && handleDownload(patient.orthancStudyId, patient.id)}
                          disabled={!!downloading && downloading === patient.orthancStudyId}
                        >
                          {downloading === patient.orthancStudyId ? (
                            "Descargando..."
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}