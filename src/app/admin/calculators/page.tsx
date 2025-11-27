"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CalculatorForm from "./CalculatorForm";
import CalculatorCard from "./CalculatorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2 } from "lucide-react";

export default function AdminCalculatorsPage() {
  const [calculators, setCalculators] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Fetch Calculators and Categories
  useEffect(() => {
    const unsubCalculators = onSnapshot(collection(db, "calculators"), (snap) => {
      setCalculators(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching calculators:", error);
      toast({
        variant: "destructive",
        title: "Error loading calculators",
        description: "Please refresh the page"
      });
      setLoading(false);
    });

    // Fetch categories
    const fetchCategories = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists() && snap.data().categories) {
          setCategories(snap.data().categories);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();

    return () => unsubCalculators();
  }, [toast]);

  const handleSave = async (payload: any) => {
    try {
      if (editing) {
        await updateDoc(doc(db, "calculators", editing.id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
        toast({ 
          title: "Calculator updated",
          description: `"${payload.name}" has been updated successfully`
        });
      } else {
        await addDoc(collection(db, "calculators"), { 
          ...payload, 
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        toast({ 
          title: "Calculator created",
          description: `"${payload.name}" has been created successfully`
        });
      }
      setOpen(false);
      setEditing(null);
    } catch (e) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Failed to save calculator",
        description: "Please try again later."
      });
    }
  };

  const handleEdit = (c: any) => {
    setEditing(c);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
  };

  const filteredCalculators = calculators.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manage Calculators</h1>
          <p className="text-muted-foreground mt-1">Create, edit, and manage system calculators.</p>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search calculators..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredCalculators.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-semibold mb-2">No calculators found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Create your first calculator to get started"}
          </p>
          {!searchTerm && (
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              Create Calculator
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCalculators.map(c => (
            <CalculatorCard key={c.id} calc={c} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {/* Dialog / Drawer for add/edit */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit Calculator" : "Add Calculator"}
              </h2>
              <button 
                onClick={handleClose} 
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <CalculatorForm 
              open={open} 
              onOpenChange={setOpen} 
              onSave={handleSave} 
              initial={editing}
              onCancel={handleClose}
              categories={categories}
            />
          </div>
        </div>
      )}
    </div>
  );
}