import { apiClient } from './client';
import { useProjectStore, useGlobalStore } from '../store';

// Types (will be expanded in types/index.ts)
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: Project['status'];
  priority?: Project['priority'];
  progress?: number;
  tags?: string[];
}

export interface ProjectFilters {
  status?: Project['status'];
  priority?: Project['priority'];
  tags?: string[];
  search?: string;
}

export interface ProjectStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  cancelled: number;
  avgProgress: number;
}

export interface ProjectResponse {
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ProjectService {
  // Get all projects with optional filtering and pagination
  async getProjects(filters?: ProjectFilters, page = 1, limit = 20): Promise<ProjectResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.tags && { tags: filters.tags.join(',') }),
    });

    return apiClient.get<ProjectResponse>(`/api/projects?${params}`);
  }

  // Get single project by ID
  async getProject(id: string): Promise<Project> {
    return apiClient.get<Project>(`/api/projects/${id}`);
  }

  // Create new project
  async createProject(project: CreateProjectRequest): Promise<Project> {
    return apiClient.post<Project>('/api/projects', project);
  }

  // Update project
  async updateProject(id: string, updates: UpdateProjectRequest): Promise<Project> {
    return apiClient.put<Project>(`/api/projects/${id}`, updates);
  }

  // Delete project
  async deleteProject(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/projects/${id}`);
  }

  // Get project statistics
  async getProjectStats(): Promise<ProjectStats> {
    return apiClient.get<ProjectStats>('/api/projects/stats');
  }

  // Get project activity
  async getProjectActivity(id: string, limit = 50): Promise<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
    user?: {
      id: string;
      name: string;
    };
  }>> {
    return apiClient.get<Array<{
      id: string;
      type: string;
      message: string;
      timestamp: Date;
      user?: {
        id: string;
        name: string;
      };
    }>>(`/api/projects/${id}/activity?limit=${limit}`);
  }

  // Archive project
  async archiveProject(id: string): Promise<Project> {
    return apiClient.put<Project>(`/api/projects/${id}/archive`);
  }

  // Unarchive project
  async unarchiveProject(id: string): Promise<Project> {
    return apiClient.put<Project>(`/api/projects/${id}/unarchive`);
  }

  // Duplicate project
  async duplicateProject(id: string): Promise<Project> {
    return apiClient.post<Project>(`/api/projects/${id}/duplicate`);
  }

  // Get project collaborators
  async getProjectCollaborators(id: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    joinedAt: Date;
  }>> {
    return apiClient.get<Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      avatar?: string;
      joinedAt: Date;
    }>>(`/api/projects/${id}/collaborators`);
  }

  // Add collaborator to project
  async addCollaborator(id: string, email: string, role: string = 'member'): Promise<void> {
    return apiClient.post<void>(`/api/projects/${id}/collaborators`, { email, role });
  }

  // Remove collaborator from project
  async removeCollaborator(id: string, userId: string): Promise<void> {
    return apiClient.delete<void>(`/api/projects/${id}/collaborators/${userId}`);
  }

  // Update collaborator role
  async updateCollaboratorRole(id: string, userId: string, role: string): Promise<void> {
    return apiClient.put<void>(`/api/projects/${id}/collaborators/${userId}`, { role });
  }

  // Search projects
  async searchProjects(query: string, filters?: ProjectFilters): Promise<Project[]> {
    const params = new URLSearchParams({
      q: query,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.tags && { tags: filters.tags.join(',') }),
    });

    return apiClient.get<Project[]>(`/api/projects/search?${params}`);
  }

  // Export project data
  async exportProject(id: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<Blob> {
    return apiClient.get<Blob>(`/api/projects/${id}/export?format=${format}`, {
      responseType: 'blob',
    });
  }

  // Import project data
  async importProject(file: File): Promise<Project> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post<Project>('/api/projects/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // React hook for project operations
  static useProjects() {
    const projectStore = useProjectStore();
    const globalStore = useGlobalStore();

    const loadProjects = async (filters?: ProjectFilters) => {
      globalStore.setLoading(true);
      try {
        await projectStore.fetchProjects();
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to load projects'));
      } finally {
        globalStore.setLoading(false);
      }
    };

    const createProject = async (project: CreateProjectRequest) => {
      globalStore.setLoading(true);
      try {
        await projectStore.createProject(project);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to create project'));
        throw error;
      } finally {
        globalStore.setLoading(false);
      }
    };

    const updateProject = async (id: string, updates: UpdateProjectRequest) => {
      globalStore.setLoading(true);
      try {
        await projectStore.updateProject(id, updates);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to update project'));
        throw error;
      } finally {
        globalStore.setLoading(false);
      }
    };

    const deleteProject = async (id: string) => {
      globalStore.setLoading(true);
      try {
        await projectStore.deleteProject(id);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to delete project'));
        throw error;
      } finally {
        globalStore.setLoading(false);
      }
    };

    return {
      // State
      projects: projectStore.projects,
      currentProject: projectStore.currentProject,
      isLoading: projectStore.isLoading,
      error: projectStore.error,
      
      // Actions
      loadProjects,
      createProject,
      updateProject,
      deleteProject,
      setCurrentProject: projectStore.setCurrentProject,
      updateProjectInList: projectStore.updateProjectInList,
      removeProjectFromList: projectStore.removeProjectFromList,
      getProject: projectStore.getProject,
    };
  }
}

// Export singleton instance
export const projectService = new ProjectService();

// Export convenience methods
export const {
  getProjects,
  getProject,
  createProject: createProjectAPI,
  updateProject: updateProjectAPI,
  deleteProject: deleteProjectAPI,
  getProjectStats,
  getProjectActivity,
  archiveProject,
  unarchiveProject,
  duplicateProject,
  getProjectCollaborators,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
  searchProjects,
  exportProject,
  importProject,
} = projectService;

// Export hook
export const useProjects = ProjectService.useProjects;