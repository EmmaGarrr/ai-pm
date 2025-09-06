"use client";

import * as React from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useProjectStore, useGlobalStore } from "@/lib/store";
import { Project } from "@/lib/types";

export default function ProjectsPage() {
  const { 
    projects, 
    isLoading, 
    error, 
    fetchProjects, 
    createProject,
    setCurrentProject 
  } = useProjectStore();
  
  const { isLoading: globalLoading, setError } = useGlobalStore();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Load projects on component mount
  React.useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      await fetchProjects();
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to load projects'));
    }
  };

  const handleProjectCreate = async (projectData: { name: string; description: string; priority: string }) => {
    try {
      await createProject({
        name: projectData.name,
        description: projectData.description,
        priority: projectData.priority as 'low' | 'medium' | 'high' | 'urgent',
      });
      setIsDialogOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to create project'));
    }
  };

  const handleProjectClick = (project: Project) => {
    setCurrentProject(project);
  };

  // Convert store projects to card format
  const projectCards = projects.map((project) => ({
    title: project.name,
    description: project.description,
    progress: project.progress || 0,
    members: (project.collaborators || []).slice(0, 4).map((collaborator, index) => ({
      fallback: collaborator.user?.name
        ?.split(' ')
        ?.map(n => n[0])
        ?.join('')
        ?.toUpperCase()
        ?.slice(0, 2) || 'U',
      src: collaborator.user?.avatar,
    })),
    status: getProjectStatusText(project.status),
  }));

  // Show loading state
  if (isLoading && projects.length === 0) {
    return (
      <>
        <Header title="Projects">
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </Header>
        <main className="flex-1 p-6 md:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading projects...</p>
            </div>
          </div>
        </main>
        <CreateProjectDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onProjectCreate={handleProjectCreate}
        />
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <>
        <Header title="Projects">
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </Header>
        <main className="flex-1 p-6 md:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Projects</h3>
              <p className="text-gray-600 mb-4">{error.message || error.toString()}</p>
              <Button onClick={loadProjects} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        </main>
        <CreateProjectDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onProjectCreate={handleProjectCreate}
        />
      </>
    );
  }

  // Show empty state
  if (projects.length === 0) {
    return (
      <>
        <Header title="Projects">
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </Header>
        <main className="flex-1 p-6 md:p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Projects Yet</h3>
              <p className="text-gray-600 mb-4">Create your first project to get started</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </div>
          </div>
        </main>
        <CreateProjectDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onProjectCreate={handleProjectCreate}
        />
      </>
    );
  }

  return (
    <>
      <Header title="Projects">
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </Header>
      <main className="flex-1 p-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projectCards.map((project, index) => (
            <Link
              key={projects[index].id}
              href={`/project/${projects[index].id}`}
              onClick={() => handleProjectClick(projects[index])}
            >
              <ProjectCard project={project} />
            </Link>
          ))}
        </div>
      </main>
      <CreateProjectDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onProjectCreate={handleProjectCreate}
      />
    </>
  );
}

// Helper function to convert project status to display text
function getProjectStatusText(status: string): string {
  switch (status) {
    case 'planning':
      return 'Planning';
    case 'active':
      return 'On Track';
    case 'on_hold':
      return 'On Hold';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}