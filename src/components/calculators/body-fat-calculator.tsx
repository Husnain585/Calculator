"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Calculator as CalculatorIcon, Lightbulb, Ruler, User, Info, Activity, TrendingDown, AlertTriangle } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  gender: z.enum(['male', 'female']),
  height: z.coerce.number().min(100, 'Height must be at least 100 cm').max(250, 'Height is too high'),
  waist: z.coerce.number().min(50, 'Waist must be at least 50 cm').max(200, 'Waist measurement is too large'),
  neck: z.coerce.number().min(20, 'Neck must be at least 20 cm').max(60, 'Neck measurement is too large'),
  hip: z.coerce.number().optional(),
  units: z.enum(['metric', 'imperial']).default('metric'),
  age: z.coerce.number().int().min(18, 'Age must be at least 18').max(100, 'Age is too high').optional(),
}).refine(data => data.gender === 'female' ? data.hip !== undefined && data.hip > 0 : true, {
  message: 'Hip measurement is required for females.',
  path: ['hip'],
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  bodyFatPercentage: number;
  bodyFatCategory: string;
  leanBodyMass: number;
  fatMass: number;
  idealRange: string;
  categoryColor: String,
  categoryDescription: string;
}

export default function BodyFatCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: 'male',
      height: undefined,
      waist: undefined,
      neck: undefined,
      hip: undefined,
      units: 'metric',
      age: 30,
    },
  });
  
  const gender = form.watch('gender');
  const units = form.watch('units');

  const getBodyFatCategory = (percentage: number, gender: string, age?: number) => {
    // Simplified categories based on general guidelines
    if (gender === 'male') {
      if (percentage < 6) return { category: 'Essential Fat', color: 'bg-purple-500', description: 'Minimum for physiological health' };
      if (percentage < 14) return { category: 'Athletic', color: 'bg-green-500', description: 'Typical for athletes' };
      if (percentage < 18) return { category: 'Fitness', color: 'bg-blue-500', description: 'Good fitness level' };
      if (percentage < 25) return { category: 'Average', color: 'bg-yellow-500', description: 'Average for general population' };
      return { category: 'Obese', color: 'bg-red-500', description: 'Increased health risks' };
    } else {
      if (percentage < 14) return { category: 'Essential Fat', color: 'bg-purple-500', description: 'Minimum for physiological health' };
      if (percentage < 21) return { category: 'Athletic', color: 'bg-green-500', description: 'Typical for athletes' };
      if (percentage < 25) return { category: 'Fitness', color: 'bg-blue-500', description: 'Good fitness level' };
      if (percentage < 32) return { category: 'Average', color: 'bg-yellow-500', description: 'Average for general population' };
      return { category: 'Obese', color: 'bg-red-500', description: 'Increased health risks' };
    }
  };

  const getIdealRange = (gender: string) => {
    return gender === 'male' ? '8-19%' : '21-33%';
  };

  const calculateBodyFat = (data: FormValues) => {
    let height = data.height;
    let waist = data.waist;
    let neck = data.neck;
    let hip = data.hip;

    // Convert imperial to metric if needed
    if (data.units === 'imperial') {
      height = data.height * 2.54;
      waist = data.waist * 2.54;
      neck = data.neck * 2.54;
      hip = data.hip ? data.hip * 2.54 : undefined;
    }

    const { gender } = data;
    
    let bodyFatPercentage;
    if (gender === 'male') {
      bodyFatPercentage = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
    } else {
      bodyFatPercentage = 163.205 * Math.log10(waist + hip! - neck) - 97.684 * Math.log10(height) - 78.387;
    }

    // Ensure result is within reasonable bounds
    bodyFatPercentage = Math.max(3, Math.min(50, bodyFatPercentage));

    const categoryInfo = getBodyFatCategory(bodyFatPercentage, gender, data.age);
    const idealRange = getIdealRange(gender);

    // Calculate lean body mass and fat mass (assuming average weight for demonstration)
    const estimatedWeight = gender === 'male' ? 70 : 60; // kg
    const fatMass = (bodyFatPercentage / 100) * estimatedWeight;
    const leanBodyMass = estimatedWeight - fatMass;

    return { 
      bodyFatPercentage,
      bodyFatCategory: categoryInfo.category,
      leanBodyMass,
      fatMass,
      idealRange,
      categoryColor: categoryInfo.color,
      categoryDescription: categoryInfo.description
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const result = calculateBodyFat(data);
    setResult(result as any);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Body Fat Calculator',
        bodyFatPercentage: result.bodyFatPercentage,
        category: result.bodyFatCategory,
        gender: data.gender,
        age: data.age
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("For accurate measurements, take them in the morning before eating or drinking, and be consistent with your technique. Measure at the widest point for waist and hips.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      gender: 'male',
      height: undefined,
      waist: undefined,
      neck: undefined,
      hip: undefined,
      units: 'metric',
      age: 30,
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const measurementTips = [
    { point: 'Height', tip: 'Stand straight against a wall without shoes' },
    { point: 'Neck', tip: 'Measure below the larynx, tilt head slightly forward' },
    { point: 'Waist', tip: 'Measure at the narrowest point or at navel level' },
    { point: 'Hips', tip: 'Measure at the widest point of buttocks' },
  ];

  const bodyFatRanges = [
    { category: 'Essential Fat', male: '2-5%', female: '10-13%', description: 'Minimum for basic physiological functions' },
    { category: 'Athletes', male: '6-13%', female: '14-20%', description: 'Typical for trained athletes' },
    { category: 'Fitness', male: '14-17%', female: '21-24%', description: 'Good fitness level' },
    { category: 'Average', male: '18-24%', female: '25-31%', description: 'Average for general population' },
    { category: 'Obese', male: '25%+', female: '32%+', description: 'Increased health risks' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Body Fat Calculator</CardTitle>
            <CardDescription>
              Estimate your body fat percentage using the U.S. Navy method with body measurements
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                {/* Units Selection */}
                <FormField
                  control={form.control}
                  name="units"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        Measurement Units
                      </FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="metric" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Metric (cm)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="imperial" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Imperial (inches)
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Gender
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4 pt-2"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="male" />
                              </FormControl>
                              <FormLabel className="font-normal">Male</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="female" />
                              </FormControl>
                              <FormLabel className="font-normal">Female</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Age (optional)
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height ({units === 'metric' ? 'cm' : 'inches'})</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={units === 'metric' ? 'e.g., 180' : 'e.g., 70'} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="neck"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Neck ({units === 'metric' ? 'cm' : 'inches'})</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={units === 'metric' ? 'e.g., 38' : 'e.g., 15'} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="waist"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Waist ({units === 'metric' ? 'cm' : 'inches'})</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={units === 'metric' ? 'e.g., 90' : 'e.g., 35'} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {gender === 'female' && (
                    <FormField
                      control={form.control}
                      name="hip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hip ({units === 'metric' ? 'cm' : 'inches'})</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder={units === 'metric' ? 'e.g., 97' : 'e.g., 38'} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Measurement Tips */}
                <div className="pt-4 border-t">
                  <CardDescription className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4" />
                    Measurement Guidelines
                  </CardDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {measurementTips.map((tip, index) => (
                      <div key={index} className="border rounded-lg p-2">
                        <div className="font-medium">{tip.point}</div>
                        <div className="text-muted-foreground">{tip.tip}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate Body Fat
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Body Composition Visualization */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Body Composition</CardTitle>
              <CardDescription>
                Breakdown of your estimated body composition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Lean Body Mass</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {result.leanBodyMass.toFixed(1)} kg
                    </p>
                    <p className="text-xs text-blue-600">Muscle, bones, organs</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Fat Mass</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {result.fatMass.toFixed(1)} kg
                    </p>
                    <p className="text-xs text-orange-600">Body fat storage</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-orange-600" />
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Lean Mass vs Fat Mass</span>
                    <span>{result.bodyFatPercentage.toFixed(1)}% Fat</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(result.leanBodyMass / (result.leanBodyMass + result.fatMass)) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Lean Mass</span>
                    <span>Fat Mass</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Educational Content */}
        <div className="mt-8">
          <Tabs defaultValue="calculation" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calculation">Calculation</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
            </TabsList>

            <TabsContent value="calculation">
              <Accordion type="single" collapsible>
                <AccordionItem value="formula">
                  <AccordionTrigger>How is body fat percentage calculated?</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>
                        This calculator uses the U.S. Navy method, which was developed by the Naval Health Research Center and is based on body circumference measurements.
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold">For Men:</h4>
                          <div className="font-mono bg-muted p-4 rounded-md my-2 text-sm overflow-x-auto">
                            BFP = 86.010 × log10(waist - neck) - 70.041 × log10(height) + 36.76
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold">For Women:</h4>
                          <div className="font-mono bg-muted p-4 rounded-md my-2 text-sm overflow-x-auto">
                            BFP = 163.205 × log10(waist + hip - neck) - 97.684 × log10(height) - 78.387
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-yellow-800 mb-1">Important Note</h4>
                            <p className="text-sm text-yellow-700">
                              This method provides an estimate and may not be as accurate as clinical methods like DEXA scans, hydrostatic weighing, or Bod Pod tests.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="categories">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Body Fat Percentage Categories</h4>
                    <div className="space-y-3">
                      {bodyFatRanges.map((range, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="font-medium mb-2">{range.category}</div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <div className="text-muted-foreground">Men</div>
                              <div className="font-semibold">{range.male}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Women</div>
                              <div className="font-semibold">{range.female}</div>
                            </div>
                            <div className="col-span-1">
                              <div className="text-muted-foreground">Description</div>
                              <div className="text-xs text-muted-foreground">{range.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="accuracy">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Measurement Accuracy Tips</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="font-medium text-green-600">Best Practices</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Measure in the morning before eating</li>
                          <li>Use a flexible, non-stretch tape measure</li>
                          <li>Keep tape parallel to the floor</li>
                          <li>Don't pull tape too tight</li>
                          <li>Be consistent with measurement locations</li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <div className="font-medium text-blue-600">Common Errors</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Measuring over clothing</li>
                          <li>Inconsistent tape tension</li>
                          <li>Wrong measurement locations</li>
                          <li>Measuring after exercise</li>
                          <li>Not standing in natural posture</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Body Fat Analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Body Fat</p>
                  <p className="text-4xl font-bold text-primary my-2">
                    {result.bodyFatPercentage.toFixed(1)}%
                  </p>
                  <Badge className={`${result.categoryColor} text-white`}>
                    {result.bodyFatCategory}
                  </Badge>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <span className="font-semibold">{result.bodyFatCategory}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ideal Range</span>
                    <span className="font-semibold text-green-600">{result.idealRange}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Gender</span>
                    <span className="font-semibold capitalize">{gender}</span>
                  </div>
                </div>

                {/* Health Insight */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Health Insight</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {result.categoryDescription}. {
                      result.bodyFatCategory === 'Essential Fat' ? 'Maintain adequate nutrition.' :
                      result.bodyFatCategory === 'Athletic' ? 'Excellent for athletic performance.' :
                      result.bodyFatCategory === 'Fitness' ? 'Good level for overall health.' :
                      result.bodyFatCategory === 'Average' ? 'Consider lifestyle improvements.' :
                      'Focus on sustainable fat loss strategies.'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalculatorIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your measurements to estimate body fat percentage.
                </p>
              </div>
            )}

            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Measurement Tip</CardTitle>
                </div>
                {suggestionLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{suggestion}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}