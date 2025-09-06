"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Project {
  title: string;
  description: string;
  progress: number;
  members: { src?: string; fallback: string }[];
  status: "On Track" | "At Risk" | "Completed";
}

export function ProjectCard({ project }: { project: Project }) {
  const statusColor = {
    "On Track": "bg-green-500",
    "At Risk": "bg-yellow-500",
    Completed: "bg-blue-500",
  };

  return (
    <Card className="shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg font-medium">{project.title}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground pt-1">{project.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Progress</span>
          <span className="text-sm font-medium">{project.progress}%</span>
        </div>
        <Progress value={project.progress} className="h-2" />
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-4">
        <div className="flex -space-x-2">
          {project.members.map((member, index) => (
            <Avatar key={index} className="h-8 w-8 border-2 border-card">
              <AvatarImage src={member.src} />
              <AvatarFallback>{member.fallback}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn("h-2 w-2 rounded-full", statusColor[project.status])}
          />
          <span className="text-xs text-muted-foreground">
            {project.status}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}