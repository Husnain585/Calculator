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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Code, Share2, Calculator as CalculatorIcon, Lightbulb, AlertTriangle, Info } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  height: z.coerce.number().positive('Height must be positive'),
  weight: z.coerce.number().positive('Weight must be positive'),
  unit: z.enum(['metric', 'imperial']).default('metric'),
});

type BmiFormValues = z.infer<typeof formSchema>;

export default function BmiCalculator() {
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState<string>('');
  const [bmiPrime, setBmiPrime] = useState<number | null>(null);
  const [detailedCategory, setDetailedCategory] = useState<string>('');
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<BmiFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      height: undefined,
      weight: undefined,
      unit: 'metric',
    },
  });

  const unit = form.watch('unit');

  const getBmiCategory = (bmiValue: number) => {
    if (bmiValue < 16) return { category: 'Severe Thinness', color: 'bg-red-500' };
    if (bmiValue < 17) return { category: 'Moderate Thinness', color: 'bg-orange-500' };
    if (bmiValue < 18.5) return { category: 'Mild Thinness', color: 'bg-yellow-500' };
    if (bmiValue < 25) return { category: 'Normal weight', color: 'bg-green-500' };
    if (bmiValue < 30) return { category: 'Overweight', color: 'bg-yellow-500' };
    if (bmiValue < 35) return { category: 'Obese Class I', color: 'bg-orange-500' };
    if (bmiValue < 40) return { category: 'Obese Class II', color: 'bg-red-500' };
    return { category: 'Obese Class III', color: 'bg-red-700' };
  };

  const getBmiPrime = (bmiValue: number) => {
    return bmiValue / 25;
  };

  const calculateBmi = (height: number, weight: number, unit: string) => {
    if (unit === 'imperial') {
      // Convert imperial to metric
      const heightInCm = height * 2.54; // feet/inches to cm
      const weightInKg = weight * 0.453592; // pounds to kg
      const heightInMeters = heightInCm / 100;
      return weightInKg / (heightInMeters * heightInMeters);
    } else {
      const heightInMeters = height / 100;
      return weight / (heightInMeters * heightInMeters);
    }
  };

  const onSubmit: SubmitHandler<BmiFormValues> = async (data) => {
    const calculatedBmi = calculateBmi(data.height, data.weight, data.unit);
    setBmi(calculatedBmi);
    
    const { category, color } = getBmiCategory(calculatedBmi);
    setBmiCategory(category);
    setDetailedCategory(category);
    
    const prime = getBmiPrime(calculatedBmi);
    setBmiPrime(prime);

    // Fetch AI suggestion
    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const result = await suggestNextStep({ 
        calculatorName: 'BMI Calculator',
        bmi: calculatedBmi,
        category: category
      });
      setSuggestion(result.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Consider consulting with a healthcare professional for personalized advice based on your BMI results.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset();
    setBmi(null);
    setBmiCategory('');
    setBmiPrime(null);
    setDetailedCategory('');
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'Severe Thinness': 'bg-red-500',
      'Moderate Thinness': 'bg-orange-500',
      'Mild Thinness': 'bg-yellow-500',
      'Normal weight': 'bg-green-500',
      'Overweight': 'bg-yellow-500',
      'Obese Class I': 'bg-orange-500',
      'Obese Class II': 'bg-red-500',
      'Obese Class III': 'bg-red-700',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>BMI Calculator</CardTitle>
            <CardDescription>
              Calculate your Body Mass Index to understand your weight category
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit System</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit system" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="metric">Metric (cm, kg)</SelectItem>
                          <SelectItem value="imperial">Imperial (ft/in, lbs)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {unit === 'metric' ? 'Height (cm)' : 'Height (ft)'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={unit === 'metric' ? 'e.g., 175' : 'e.g., 5.8'}
                            step={unit === 'metric' ? '1' : '0.1'}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {unit === 'metric' ? 'Weight (kg)' : 'Weight (lbs)'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={unit === 'metric' ? 'e.g., 70' : 'e.g., 154'}
                            step="0.1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate BMI
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* BMI Chart Visualization */}
        {bmi !== null && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>BMI Scale</CardTitle>
              <CardDescription>
                See where your BMI falls on the standard scale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-8 bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 via-orange-400 to-red-400 rounded-full mb-4">
                <div 
                  className="absolute top-0 w-1 h-10 bg-black -ml-0.5"
                  style={{ left: `${Math.min(bmi / 40 * 100, 100)}%` }}
                >
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-sm font-medium">
                    Your BMI: {bmi.toFixed(1)}
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Underweight</span>
                <span>Normal</span>
                <span>Overweight</span>
                <span>Obese</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Your Results</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {bmi !== null ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Your BMI is</p>
                  <p className="text-5xl font-bold my-2">{bmi.toFixed(1)}</p>
                  <Badge className={`${getCategoryColor(detailedCategory)} text-white`}>
                    {bmiCategory}
                  </Badge>
                </div>
                
                {bmiPrime !== null && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">BMI Prime</p>
                    <p className="text-2xl font-semibold">{bmiPrime.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {bmiPrime < 0.74 ? 'Underweight' : 
                       bmiPrime <= 1 ? 'Normal' : 
                       bmiPrime <= 1.2 ? 'Overweight' : 'Obese'}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">What this means</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {bmi < 18.5 ? 'You may be underweight. Consider consulting a healthcare provider.' :
                     bmi < 25 ? 'Your weight is within the normal range for your height.' :
                     bmi < 30 ? 'You may be overweight. Consider lifestyle adjustments.' :
                     'You may be obese. Consulting a healthcare provider is recommended.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalculatorIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your height and weight to calculate your BMI.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Next Step</CardTitle>
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
            <TabsTrigger value="categories">BMI Categories</TabsTrigger>
            <TabsTrigger value="limitations">Limitations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is BMI calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Body Mass Index (BMI) is a measure of body fat based on height
                      and weight that applies to adult men and women.
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2">Metric Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md">
                          BMI = weight (kg) / [height (m)]²
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Example: 70kg ÷ (1.75m × 1.75m) = 22.9
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-2">Imperial Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md">
                          BMI = 703 × weight (lbs) / [height (in)]²
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Example: 703 × 154lbs ÷ (70in × 70in) = 22.1
                        </p>
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
                <h3 className="font-semibold mb-4">WHO BMI Categories for Adults</h3>
                <div className="space-y-2">
                  {[
                    { range: 'Below 18.5', category: 'Underweight', subcategories: [
                      'Severe Thinness: < 16',
                      'Moderate Thinness: 16 - 17',
                      'Mild Thinness: 17 - 18.5'
                    ]},
                    { range: '18.5 - 24.9', category: 'Normal weight' },
                    { range: '25.0 - 29.9', category: 'Overweight' },
                    { range: '30.0 and above', category: 'Obese', subcategories: [
                      'Obese Class I: 30 - 35',
                      'Obese Class II: 35 - 40',
                      'Obese Class III: > 40'
                    ]}
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-2 border-b">
                      <Badge variant="outline" className="whitespace-nowrap">
                        {item.range}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.category}</p>
                        {item.subcategories && (
                          <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                            {item.subcategories.map((sub, subIndex) => (
                              <li key={subIndex}>• {sub}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limitations">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-semibold">Important Limitations</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <p>BMI has several limitations you should be aware of:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Doesn't distinguish between muscle and fat mass</li>
                    <li>May misclassify athletes and muscular individuals</li>
                    <li>Doesn't account for fat distribution</li>
                    <li>May be less accurate for older adults</li>
                    <li>Doesn't consider ethnic differences in body composition</li>
                  </ul>
                  <p className="font-medium mt-4">
                    BMI should be used as a screening tool, not a diagnostic measure.
                    Consult healthcare professionals for comprehensive health assessment.
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