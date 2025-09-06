"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, Plus, X } from "lucide-react";
import { useProjects } from "@/lib/api/projectService";
import { useGlobalStore } from "@/lib/store";
import { ProjectPriority } from "@/lib/types";

interface CreateProjectDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onProjectCreate?: (projectData: { name: string; description: string; priority: string }) => void;
}

export function CreateProjectDialog({
  isOpen,
  onOpenChange,
  onProjectCreate,
}: CreateProjectDialogProps) {
  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    priority: "medium" as ProjectPriority,
  });
  const [tags, setTags] = React.useState<string[]>([]);
  const [newTag, setNewTag] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { createProject } = useProjects();
  const globalStore = useGlobalStore();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Project name is required";
    } else if (formData.name.length < 3) {
      newErrors.name = "Project name must be at least 3 characters";
    } else if (formData.name.length > 100) {
      newErrors.name = "Project name must be less than 100 characters";
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 10) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const projectData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        tags: tags,
      };

      await createProject(projectData);
      
      setIsSuccess(true);
      
      // Call optional callback for backward compatibility
      onProjectCreate?.(projectData);

      // Auto-close dialog after success
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      globalStore.setError(error instanceof Error ? error : new Error('Failed to create project'));
      
      // Handle specific API errors
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          setErrors({ name: 'A project with this name already exists' });
        } else if (error.message.includes('permission')) {
          setErrors({ name: 'You do not have permission to create projects' });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when dialog is closed
    setTimeout(() => {
      setFormData({ name: "", description: "", priority: "medium" });
      setTags([]);
      setNewTag("");
      setIsLoading(false);
      setIsSuccess(false);
      setErrors({});
    }, 200);
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isSuccess ? "Project Created!" : "Create a new project"}
          </DialogTitle>
        </DialogHeader>
        
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 transition-all duration-300">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4 animate-in fade-in zoom-in" />
            <p className="text-lg font-medium">Your project has been created successfully!</p>
            <p className="text-sm text-muted-foreground mt-2">
              You can now start collaborating on your project.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-right font-medium">
                Project Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g. Q3 Marketing Campaign"
                disabled={isLoading}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <div className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.name}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Brief description of the project goals and objectives..."
                disabled={isLoading}
                rows={3}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <div className="flex items-center gap-1 text-red-500 text-sm">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.description}</span>
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="font-medium">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange("priority", value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Low Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      Medium Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      High Priority
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      Urgent Priority
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="font-medium">Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a tag..."
                  disabled={isLoading || tags.length >= 10}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || tags.length >= 10 || isLoading}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Tags Display */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-sm">
                      {tag}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer hover:text-red-500"
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {tags.length}/10 tags maximum
              </p>
            </div>

            <DialogFooter className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.name.trim()}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}