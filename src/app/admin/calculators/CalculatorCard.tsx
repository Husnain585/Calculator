
// src/app/admin/calculators/CalculatorCard.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { evaluate } from "mathjs";

type Calc = {
  id: string;
  name: string;
  type?: string;
  description?: string;
  formula?: string;
  variables?: string[];
  enabled?: boolean;
};

export default function CalculatorCard({ calc, onEdit }: { calc: Calc; onEdit: (c: Calc) => void }) {
  const { toast } = useToast(); // Fixed: destructure toast
  const [enabled, setEnabled] = useState(!!calc.enabled);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | number>("—");

  const toggleEnable = async () => {
    try {
      await updateDoc(doc(db, "calculators", calc.id), { enabled: !enabled });
      setEnabled(!enabled);
      toast({ 
        title: `Calculator ${!enabled ? "enabled" : "disabled"}`,
        description: `${calc.name} has been ${!enabled ? "enabled" : "disabled"}`
      });
    } catch (e) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Error updating status",
        description: "Please try again later."
      });
    }
  };

  const runTest = () => {
    if (!calc.formula) {
      setResult("No formula");
      toast({
        variant: "destructive",
        title: "No formula",
        description: "This calculator doesn't have a formula defined"
      });
      return;
    }
    try {
      // prepare scope for mathjs evaluate
      const scope: Record<string, number> = {};
      (calc.variables ?? []).forEach((v) => {
        const val = Number(inputs[v]);
        scope[v] = isNaN(val) ? 0 : val;
      });
      
      // Check if all required variables have values
      const missingVars = (calc.variables ?? []).filter(v => !inputs[v] || inputs[v].trim() === '');
      if (missingVars.length > 0) {
        setResult("Missing inputs");
        toast({
          variant: "destructive",
          title: "Missing inputs",
          description: `Please enter values for: ${missingVars.join(', ')}`
        });
        return;
      }

      // mathjs evaluate — formula expected to be a JS/math expression using variables
      const res = evaluate(calc.formula, scope);
      setResult(res);
      
      toast({
        title: "Calculation successful",
        description: `Result: ${res}`
      });
    } catch (e) {
      setResult("Error");
      console.error(e);
      toast({
        variant: "destructive",
        title: "Calculation error",
        description: "Please check the formula and inputs"
      });
    }
  };

  const handleInput = (name: string, value: string) => {
    setInputs((s) => ({ ...s, [name]: value }));
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${calc.name}"?`)) return;
    try {
      await deleteDoc(doc(db, "calculators", calc.id));
      toast({ 
        title: "Calculator deleted",
        description: `"${calc.name}" has been removed`
      });
    } catch (e) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Failed to delete calculator",
        description: "Please try again later."
      });
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow border">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{calc.name}</h3>
          <p className="text-sm text-muted-foreground">{calc.description}</p>
          {calc.type && (
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
              {calc.type}
            </span>
          )}
        </div>
        <div className="text-sm">
          
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {calc.variables?.map((v) => (
          <Input 
            key={v} 
            placeholder={v} 
            value={inputs[v] ?? ""} 
            onChange={(e) => handleInput(v, e.target.value)}
            type="number"
            step="any"
          />
        ))}
      </div>

    </div>
  );
}