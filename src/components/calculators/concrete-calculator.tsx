
"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calculator, Lightbulb, Ruler, Truck, AlertTriangle, Info, Building, Weight } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const formSchema = z.object({
  length: z.coerce.number().positive('Length must be positive'),
  width: z.coerce.number().positive('Width must be positive'),
  depth: z.coerce.number().positive('Depth must be positive'),
  units: z.enum(['feet', 'meters']),
  projectType: z.enum(['slab', 'footings', 'walls', 'columns']).default('slab'),
  wastePercentage: z.coerce.number().min(0).max(50).default(10),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  cubicYards: number;
  cubicMeters: number;
  totalCubicYards: number;
  totalCubicMeters: number;
  bags80lb: number;
  bags60lb: number;
  estimatedWeight: number;
  truckLoads: number;
}

export default function ConcreteCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      units: 'feet',
      projectType: 'slab',
      wastePercentage: 10,
    },
  });

  const units = form.watch('units');
  const projectType = form.watch('projectType');
  const wastePercentage = form.watch('wastePercentage');

  const getProjectTypeInfo = (type: string) => {
    const info = {
      'slab': { label: 'Slab', icon: '🏗️', description: 'Flat concrete surface' },
      'footings': { label: 'Footings', icon: '📐', description: 'Foundation base' },
      'walls': { label: 'Walls', icon: '🧱', description: 'Vertical concrete structures' },
      'columns': { label: 'Columns', icon: '🏛️', description: 'Support columns' },
    };
    return info[type as keyof typeof info] || info.slab;
  };

  const getRecommendedDepth = (type: string, units: string) => {
    const depths = {
      'slab': units === 'feet' ? 4 : 0.1,
      'footings': units === 'feet' ? 8 : 0.2,
      'walls': units === 'feet' ? 6 : 0.15,
      'columns': units === 'feet' ? 12 : 0.3,
    };
    return depths[type as keyof typeof depths] || depths.slab;
  };

  const applyRecommendedDepth = () => {
    const depth = getRecommendedDepth(projectType, units);
    form.setValue('depth', depth);
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    let volumeCubicFeet: number;
    const { length, width, depth, units, wastePercentage } = data;

    if (units === 'feet') {
      // Depth is in inches, convert to feet
      volumeCubicFeet = length * width * (depth / 12);
    } else { // meters
      // Convert everything to feet for a common calculation base
      const lengthFt = length * 3.28084;
      const widthFt = width * 3.28084;
      const depthFt = depth * 3.28084;
      volumeCubicFeet = lengthFt * widthFt * depthFt;
    }

    const cubicYards = volumeCubicFeet / 27;
    const cubicMeters = cubicYards * 0.764555;
    
    // Calculate total with waste
    const totalCubicYards = cubicYards * (1 + wastePercentage / 100);
    const totalCubicMeters = cubicMeters * (1 + wastePercentage / 100);
    
    // Calculate bags needed (0.6 cubic feet per 80lb bag, 0.45 per 60lb bag)
    const bags80lb = Math.ceil((totalCubicYards * 27) / 0.6);
    const bags60lb = Math.ceil((totalCubicYards * 27) / 0.45);
    
    // Estimated weight (concrete weighs ~150 lb/cu ft)
    const estimatedWeight = totalCubicYards * 27 * 150;
    
    // Truck loads (standard truck carries ~10 cubic yards)
    const truckLoads = Math.ceil(totalCubicYards / 10);

    setResult({ 
      cubicYards, 
      cubicMeters,
      totalCubicYards,
      totalCubicMeters,
      bags80lb,
      bags60lb,
      estimatedWeight,
      truckLoads
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const result = await suggestNextStep({ 
        calculatorName: 'Concrete Calculator',
        volume: totalCubicYards,
        projectType,
        wastePercentage,
        truckLoads
      });
      setSuggestion(result.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Always order about 10% extra concrete to account for spillage and uneven ground levels. Consider the weather conditions - hot weather can cause concrete to set faster.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({ 
      units: 'feet', 
      length: undefined, 
      width: undefined, 
      depth: undefined,
      projectType: 'slab',
      wastePercentage: 10,
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const projectInfo = getProjectTypeInfo(projectType);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Concrete Calculator</CardTitle>
            <CardDescription>
              Calculate the amount of concrete needed for your construction project
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="slab">
                              <div className="flex items-center gap-2">
                                <span>🏗️</span>
                                <span>Slab</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="footings">
                              <div className="flex items-center gap-2">
                                <span>📐</span>
                                <span>Footings</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="walls">
                              <div className="flex items-center gap-2">
                                <span>🧱</span>
                                <span>Walls</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="columns">
                              <div className="flex items-center gap-2">
                                <span>🏛️</span>
                                <span>Columns</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="units"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Measurement Units</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="feet" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Feet & Inches
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="meters" />
                              </FormControl>
                              <FormLabel className="font-normal">Meters</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length ({units})</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder={units === 'feet' ? "e.g., 10" : "e.g., 3"} 
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width ({units})</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder={units === 'feet' ? "e.g., 8" : "e.g., 2.5"} 
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="depth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Depth ({units === 'feet' ? 'inches' : units})
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder={units === 'feet' ? "e.g., 4" : "e.g., 0.1"} 
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="wastePercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waste Factor (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="50" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{projectInfo.icon} {projectInfo.label}</p>
                      <p className="text-sm text-muted-foreground">{projectInfo.description}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyRecommendedDepth}
                    >
                      Apply Recommended Depth
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended depth: {getRecommendedDepth(projectType, units)} {units === 'feet' ? 'inches' : units}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetCalculator}
                >
                  Reset
                </Button>
                <Button type="submit">
                  <Calculator className="mr-2 h-4 w-4" /> Calculate Concrete
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Material Breakdown */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Material Requirements</CardTitle>
              <CardDescription>
                Detailed breakdown of concrete and materials needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">80lb Bags</p>
                  <p className="text-2xl font-bold">{result.bags80lb}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">60lb Bags</p>
                  <p className="text-2xl font-bold">{result.bags60lb}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Truck Loads</p>
                  <p className="text-2xl font-bold">{result.truckLoads}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Weight</p>
                  <p className="text-xl font-bold">{(result.estimatedWeight / 2000).toFixed(1)} tons</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Concrete Estimate</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Volume Needed</p>
                  <p className="text-5xl font-bold my-2">{result.totalCubicYards.toFixed(2)}</p>
                  <p className="text-lg font-semibold text-primary">cubic yards</p>
                  <Badge variant="outline" className="bg-orange-50 mt-2">
                    Includes {wastePercentage}% waste factor
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Volume</p>
                    <p className="font-semibold">{result.cubicYards.toFixed(2)} yd³</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">In Meters</p>
                    <p className="font-semibold">{result.totalCubicMeters.toFixed(2)} m³</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Truck className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Delivery Info</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {result.truckLoads === 1 ? 'Your project requires 1 concrete truck load.' :
                     result.truckLoads <= 3 ? `Your project requires ${result.truckLoads} truck loads. Schedule deliveries strategically.` :
                     `Your project requires ${result.truckLoads} truck loads. Consider multiple delivery days.`}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Project Insight</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {result.totalCubicYards < 1 ? 'Small project - consider using bags for better control.' :
                     result.totalCubicYards < 5 ? 'Medium project - ready-mix concrete is cost-effective.' :
                     'Large project - coordinate with concrete supplier for bulk pricing.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your project dimensions to calculate concrete requirements.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Construction Tip</CardTitle>
                </CardHeader>
                <CardDescription>
                  {suggestionLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : (
                    suggestion
                  )}
                </CardDescription>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Educational Content */}
      <div className="lg:col-span-3 mt-8">
        <Tabs defaultValue="calculation" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="calculation">Calculation</TabsTrigger>
            <TabsTrigger value="materials">Material Guide</TabsTrigger>
            <TabsTrigger value="considerations">Important Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is concrete volume calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Concrete volume is calculated by multiplying length × width × depth, 
                      then converting to cubic yards (the standard unit for concrete orders).
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Basic Volume Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          Volume = Length × Width × Depth
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Imperial Units</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            Cubic Yards = (Length × Width × (Depth ÷ 12)) ÷ 27
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Depth in inches converted to feet, then to cubic yards
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Metric Units</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            Cubic Meters = Length × Width × Depth
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            All measurements in meters for direct cubic meter calculation
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">With Waste Factor</h4>
                        <div className="font-mono bg-muted p-3 rounded-md text-xs">
                          Total Volume = Net Volume × (1 + Waste Percentage ÷ 100)
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Adds extra material for spillage, over-excavation, and irregularities
                        </p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="materials">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Concrete Material Guide</h3>
                <div className="space-y-4">
                  {[
                    {
                      material: "Ready-Mix Concrete",
                      description: "Pre-mixed concrete delivered by truck. Best for projects over 1 cubic yard.",
                      coverage: "1 cubic yard covers 80 sq ft at 4\" depth",
                      bestFor: "Large slabs, foundations"
                    },
                    {
                      material: "80lb Concrete Bags",
                      description: "Pre-mixed bags. Each bag makes about 0.6 cubic feet of concrete.",
                      coverage: "45 bags = 1 cubic yard",
                      bestFor: "Small projects, repairs"
                    },
                    {
                      material: "60lb Concrete Bags",
                      description: "Lighter bags for easier handling. Each makes about 0.45 cubic feet.",
                      coverage: "60 bags = 1 cubic yard",
                      bestFor: "DIY projects, steps"
                    },
                    {
                      material: "High-Strength Mix",
                      description: "Special mix for structural applications. 4000+ PSI strength.",
                      coverage: "Same volume as regular mix",
                      bestFor: "Footings, columns, driveways"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge variant="outline" className="whitespace-nowrap border-blue-200 bg-blue-50">
                        {item.material}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.description}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
                          <span>Coverage: {item.coverage}</span>
                          <span>Best for: {item.bestFor}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="considerations">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold">Important Concrete Considerations</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <p>When planning your concrete project, keep these critical factors in mind:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Site Preparation:</strong> Proper compaction and base material are essential for longevity</li>
                    <li><strong>Weather Conditions:</strong> Avoid pouring in extreme temperatures or rain</li>
                    <li><strong>Curing Time:</strong> Concrete needs 7-28 days to reach full strength depending on mix</li>
                    <li><strong>Reinforcement:</strong> Consider rebar or wire mesh for structural integrity</li>
                    <li><strong>Expansion Joints:</strong> Necessary for large slabs to prevent cracking</li>
                    <li><strong>Local Regulations:</strong> Check building codes for depth and reinforcement requirements</li>
                  </ul>
                  <p className="font-medium mt-4">
                    Always consult with a structural engineer for load-bearing applications. 
                    Consider hiring professionals for large projects or complex formations.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}