"use client"

import { useState } from "react"
import { Upload, FileText, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface UploadDialogProps {
  onAnalyzeAts: (file: File) => Promise<void>;
  onAnalyzeMatch: (file: File, jobDescription: string) => Promise<void>;
  isLoading: boolean;
  trigger?: React.ReactNode;
}

export function UploadDialog({ onAnalyzeAts, onAnalyzeMatch, isLoading, trigger }: UploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState("")
  const [mode, setMode] = useState<"ats" | "match">("match")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!file) return

    try {
      if (mode === "ats") {
        await onAnalyzeAts(file)
      } else {
        if (!jobDescription.trim()) return
        await onAnalyzeMatch(file, jobDescription)
      }
      setOpen(false) // Close on success
    } catch (error) {
      // Error is handled in hooks, but we could show a toast here if we wanted
      console.error(error)
    }
  }

  const isValid = file !== null && (mode === "ats" || jobDescription.trim().length > 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            size="lg" 
            className="gap-2 bg-gradient-to-r from-primary to-primary/90 px-6 text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            <Upload className="size-4" />
            Upload Resume
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Analyze Resume</DialogTitle>
          <DialogDescription>
            Choose a workflow to analyze your resume and gain actionable insights.
          </DialogDescription>
        </DialogHeader>

        <Tabs 
          defaultValue="match" 
          value={mode} 
          onValueChange={(v) => setMode(v as "ats" | "match")}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="match">Job Match</TabsTrigger>
            <TabsTrigger value="ats">ATS Analysis</TabsTrigger>
          </TabsList>
          
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resume">Resume (PDF or DOCX)</Label>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById("resume-upload")?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 size-4" />
                  {file ? "Change File" : "Choose File"}
                </Button>
                <Input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-primary mt-2">
                  <FileText className="size-4" />
                  <span className="truncate">{file.name}</span>
                  <CheckCircle2 className="size-4 text-emerald-500" />
                </div>
              )}
            </div>

            <TabsContent value="match" className="space-y-2 mt-0">
              <Label htmlFor="jd">Job Description</Label>
              <Textarea
                id="jd"
                placeholder="Paste the job description here..."
                className="h-32 resize-none"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll analyze your resume against this job description to evaluate fit.
              </p>
            </TabsContent>

            <TabsContent value="ats" className="space-y-2 mt-0">
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                ATS Analysis evaluates your resume's general structure, skills, and readability against standard Applicant Tracking Systems. No job description required.
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? "Analyzing..." : "Submit & Analyze"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
