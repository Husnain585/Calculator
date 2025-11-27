"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Save, Loader2, Globe, Mail, Phone, Facebook, Twitter, Linkedin, Instagram } from "lucide-react";

interface SettingsData {
  // General
  aiSuggestions: boolean;
  defaultPrecision: number;
  
  // Site Identity
  siteName: string;
  siteDescription: string;
  
  // Contact Info
  supportEmail: string;
  contactPhone: string;
  address: string;
  
  // Social Media
  facebookUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
}

const defaultSettings: SettingsData = {
  aiSuggestions: true,
  defaultPrecision: 2,
  siteName: "OmniCalculator",
  siteDescription: "Your go-to solution for all calculation needs.",
  supportEmail: "",
  contactPhone: "",
  address: "",
  facebookUrl: "",
  twitterUrl: "",
  linkedinUrl: "",
  instagramUrl: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCat, setNewCat] = useState("");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load persisted settings from Firestore
  useEffect(() => {
    (async () => {
      try {
        const ref = doc(db, "settings", "global");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.settings) {
            // Merge with defaults to ensure new fields exist
            setSettings({ ...defaultSettings, ...data.settings });
          }
          if (data.categories) {
            setCategories(data.categories);
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load settings. Check your permissions.",
        });
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [toast]);

  const saveGlobal = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "settings", "global"), { categories, settings }, { merge: true });
      toast({ title: "Settings saved successfully!" });
    } catch (e: any) {
      console.error(e);
      toast({ 
        variant: "destructive", 
        title: "Failed to save settings",
        description: e.message || "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  const addCategory = () => {
    if (!newCat.trim()) return;
    const cat = newCat.trim();
    if (categories.includes(cat)) {
      toast({
        variant: "destructive",
        title: "Duplicate Category",
        description: `Category "${cat}" already exists.`
      });
      return;
    }
    setCategories([...categories, cat]);
    setNewCat("");
  };

  const removeCategory = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
  };

  const handleChange = (field: keyof SettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (initialLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Global Settings</h1>
          <p className="text-gray-500 mt-1">Manage application-wide configurations and content.</p>
        </div>
        <Button onClick={saveGlobal} disabled={loading} size="lg">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Behavior</CardTitle>
              <CardDescription>Control basic behavior of the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2 border-b pb-4">
                <Label htmlFor="ai-suggestions" className="flex flex-col space-y-1">
                  <span className="text-base font-medium">AI Suggestions</span>
                  <span className="font-normal text-sm text-muted-foreground">Enable AI-powered next step suggestions in calculators.</span>
                </Label>
                <Switch 
                  id="ai-suggestions" 
                  checked={settings.aiSuggestions} 
                  onCheckedChange={(checked) => handleChange("aiSuggestions", checked)} 
                />
              </div>
              
              <div className="space-y-2">
                 <Label htmlFor="precision" className="text-base font-medium">Default Precision</Label>
                 <div className="flex items-center gap-4">
                   <Input 
                    id="precision"
                    type="number" 
                    value={settings.defaultPrecision} 
                    onChange={(e) => handleChange("defaultPrecision", Number(e.target.value))} 
                    className="w-32"
                    min={0}
                    max={10}
                  />
                  <span className="text-sm text-muted-foreground">Decimal places for results (0-10).</span>
                 </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Site Identity */}
        <TabsContent value="identity" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Site Identity</CardTitle>
              <CardDescription>Manage how your site appears to users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="siteName" 
                    value={settings.siteName} 
                    onChange={(e) => handleChange("siteName", e.target.value)} 
                    className="pl-9"
                    placeholder="My Awesome Calculator"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea 
                  id="siteDescription" 
                  value={settings.siteDescription} 
                  onChange={(e) => handleChange("siteDescription", e.target.value)} 
                  placeholder="Brief description of your website..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact & Social */}
        <TabsContent value="contact" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Public contact details for your users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="supportEmail" 
                      type="email"
                      value={settings.supportEmail} 
                      onChange={(e) => handleChange("supportEmail", e.target.value)} 
                      className="pl-9"
                      placeholder="support@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="contactPhone" 
                      value={settings.contactPhone} 
                      onChange={(e) => handleChange("contactPhone", e.target.value)} 
                      className="pl-9"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Physical Address</Label>
                <Textarea 
                  id="address" 
                  value={settings.address} 
                  onChange={(e) => handleChange("address", e.target.value)} 
                  placeholder="123 Main St, City, Country"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
              <CardDescription>Links to your social media profiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook URL</Label>
                  <div className="relative">
                    <Facebook className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="facebook" 
                      value={settings.facebookUrl} 
                      onChange={(e) => handleChange("facebookUrl", e.target.value)} 
                      className="pl-9"
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter / X URL</Label>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="twitter" 
                      value={settings.twitterUrl} 
                      onChange={(e) => handleChange("twitterUrl", e.target.value)} 
                      className="pl-9"
                      placeholder="https://twitter.com/..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn URL</Label>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="linkedin" 
                      value={settings.linkedinUrl} 
                      onChange={(e) => handleChange("linkedinUrl", e.target.value)} 
                      className="pl-9"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram URL</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="instagram" 
                      value={settings.instagramUrl} 
                      onChange={(e) => handleChange("instagramUrl", e.target.value)} 
                      className="pl-9"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calculator Categories</CardTitle>
              <CardDescription>Manage the categories available for grouping calculators.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="New category name..." 
                  value={newCat} 
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                />
                <Button onClick={addCategory} variant="secondary">
                  <Plus className="h-4 w-4 mr-2" /> Add
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4 p-4 border rounded-lg min-h-[100px] bg-gray-50/50">
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground w-full text-center py-8">No categories added yet.</p>
                ) : (
                  categories.map((c) => (
                    <Badge key={c} variant="secondary" className="pl-3 pr-1 py-1.5 text-sm flex items-center gap-2 bg-white border shadow-sm">
                      {c}
                      <button 
                        className="hover:bg-red-100 hover:text-red-600 rounded-full p-0.5 transition-colors" 
                        onClick={() => removeCategory(c)}
                        title="Remove category"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Note: Removing a category will not delete the calculators in it, but they may become uncategorized.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}