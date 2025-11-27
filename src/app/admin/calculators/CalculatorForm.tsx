// src/app/admin/calculators/CalculatorForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CalculatorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  initial?: any;
  onCancel?: () => void;
  categories: string[];
}

export default function CalculatorForm({ 
  open, 
  onOpenChange, 
  onSave, 
  initial, 
  onCancel,
  categories
}: CalculatorFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    categorySlug: "",
    type: "", // Keeping for backward compatibility or additional tagging
    description: "",
    formula: "",
    variables: [] as string[],
    enabled: true
  });
  
  const [newVariable, setNewVariable] = useState("");

  // Reset form when opening/closing or when initial data changes
  useEffect(() => {
    if (open) {
      if (initial) {
        setFormData({
          name: initial.name || "",
          slug: initial.slug || "",
          categorySlug: initial.categorySlug || "",
          type: initial.type || "",
          description: initial.description || "",
          formula: initial.formula || "",
          variables: initial.variables || [],
          enabled: initial.enabled !== undefined ? initial.enabled : true
        });
      } else {
        setFormData({
          name: "",
          slug: "",
          categorySlug: "",
          type: "",
          description: "",
          formula: "",
          variables: [],
          enabled: true
        });
      }
      setNewVariable("");
    }
  }, [open, initial]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updates: any = { [field]: value };
      // Auto-generate slug from name if slug is empty or matches previous auto-gen
      if (field === "name" && !initial) {
        updates.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      return { ...prev, ...updates };
    });
  };

  const addVariable = () => {
    if (newVariable.trim() && !formData.variables.includes(newVariable.trim())) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, newVariable.trim()]
      }));
      setNewVariable("");
    }
  };

  const removeVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addVariable();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name.trim()) {
      alert("Please enter a calculator name");
      return;
    }

    if (!formData.slug.trim()) {
      alert("Please enter a URL slug");
      return;
    }

    if (!formData.categorySlug) {
      alert("Please select a category");
      return;
    }

    if (!formData.formula.trim()) {
      alert("Please enter a formula");
      return;
    }

    if (formData.variables.length === 0) {
      alert("Please add at least one variable");
      return;
    }

    // Validate that all variables are used in the formula
    const missingVars = formData.variables.filter(v => 
      !formData.formula.includes(v)
    );

    if (missingVars.length > 0) {
      alert(`The following variables are not used in the formula: ${missingVars.join(', ')}`);
      return;
    }

    onSave(formData);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Calculator Name *</Label>
          <Input
            id="name"
            placeholder="e.g., Area Calculator"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            required
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug *</Label>
          <Input
            id="slug"
            placeholder="e.g., area-calculator"
            value={formData.slug}
            onChange={(e) => handleInputChange("slug", e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Unique identifier for the URL.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select 
            value={formData.categorySlug} 
            onValueChange={(val) => handleInputChange("categorySlug", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type (Optional/Tag) */}
        <div className="space-y-2">
          <Label htmlFor="type">Type / Tag</Label>
          <Input
            id="type"
            placeholder="e.g., Geometry"
            value={formData.type}
            onChange={(e) => handleInputChange("type", e.target.value)}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe what this calculator does..."
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          rows={3}
        />
      </div>

      {/* Formula */}
      <div className="space-y-2">
        <Label htmlFor="formula">Formula *</Label>
        <div className="space-y-2">
          <Input
            id="formula"
            placeholder="e.g., length * width"
            value={formData.formula}
            onChange={(e) => handleInputChange("formula", e.target.value)}
            required
          />
          <p className="text-sm text-muted-foreground">
            Use JavaScript math syntax. Variables must match exactly.
          </p>
        </div>
      </div>

      {/* Variables */}
      <div className="space-y-3">
        <Label>Variables *</Label>
        
        {/* Current Variables */}
        {formData.variables.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {formData.variables.map((variable) => (
                <div
                  key={variable}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {variable}
                  <button
                    type="button"
                    onClick={() => removeVariable(variable)}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Variable */}
        <div className="flex gap-2">
          <Input
            placeholder="Variable name (e.g., length)"
            value={newVariable}
            onChange={(e) => setNewVariable(e.target.value)}
            onKeyPress={handleKeyPress}
            className="max-w-xs"
          />
          <Button type="button" onClick={addVariable} variant="outline">
            Add Variable
          </Button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center space-x-2 pt-2">
        <input
          type="checkbox"
          id="enabled"
          checked={formData.enabled}
          onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="enabled" className="text-sm font-medium">
          Enable this calculator
        </Label>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
        >
          Cancel
        </Button>
        <Button type="submit">
          {initial ? "Update Calculator" : "Create Calculator"}
        </Button>
      </div>

      {/* Validation Preview */}
      {formData.formula && formData.variables.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Formula Preview:</h4>
          <code className="text-sm bg-background p-2 rounded block border">
            {formData.formula}
          </code>
        </div>
      )}
    </form>
  );
}