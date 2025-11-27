"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Lightbulb, Scale, Ruler, Heart, Activity } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  weight: z.coerce.number().min(20, 'Weight must be at least 20 kg').max(300, 'Weight must be less than 300 kg'),
  height: z.coerce.number().min(100, 'Height must be at least 100 cm').max(250, 'Height must be less than 250 cm'),
  unit: z.enum(['metric', 'imperial']),
});

type FormValues = z.infer<typeof formSchema>;

type BMIResult = {
  bmi: number;
  category: string;
  healthyRange: { min: number; max: number };
  color: string;
};

export default function BMICalculator() {
  const [result, setResult] = useState<BMIResult | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [history, setHistory] = useState<BMIResult[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weight: 70,
      height: 170,
      unit: 'metric',
    },
  });

  const calculateBMI = (data: FormValues): BMIResult => {
    let weight = data.weight;
    let height = data.height;

    // Convert to metric if imperial
    if (data.unit === 'imperial') {
      weight = weight * 0.453592; // pounds to kg
      height = height * 2.54; // inches to cm
    }

    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    let category: string;
    let color: string;

    if (bmi < 18.5) {
      category = 'Underweight';
      color = 'text-blue-500';
    } else if (bmi < 25) {
      category = 'Normal weight';
      color = 'text-green-500';
    } else if (bmi < 30) {
      category = 'Overweight';
      color = 'text-yellow-500';
    } else {
      category = 'Obesity';
      color = 'text-red-500';
    }

    // Calculate healthy weight range for height
    const minHealthy = 18.5 * (heightInMeters * heightInMeters);
    const maxHealthy = 24.9 * (heightInMeters * heightInMeters);

    return {
      bmi: Number(bmi.toFixed(1)),
      category,
      healthyRange: {
        min: Number(minHealthy.toFixed(1)),
        max: Number(maxHealthy.toFixed(1)),
      },
      color,
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const calculation = calculateBMI(data);
    setResult(calculation);
    setHistory(prev => [calculation, ...prev.slice(0, 3)]);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'BMI Calculator',
        inputs: data
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("BMI is a screening tool, not a diagnostic. Consider body composition and overall health. Consult healthcare professionals for personalized advice.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      weight: 70,
      height: 170,
      unit: 'metric',
    });
    setResult(null);
    setSuggestion('');
    setHistory([]);
  };

  const unit = form.watch('unit');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Panel - Forms & Features */}
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Scale className="h-6 w-6 text-primary" />
                  <CardTitle>BMI Calculator</CardTitle>
                </div>
                <CardDescription>
                  Calculate your Body Mass Index and understand your weight category.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Measurement System</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="metric">Metric (kg, cm)</SelectItem>
                          <SelectItem value="imperial">Imperial (lbs, inches)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          Weight {unit === 'metric' ? '(kg)' : '(lbs)'}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Ruler className="h-4 w-4" />
                          Height {unit === 'metric' ? '(cm)' : '(inches)'}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* BMI Chart Preview */}
                <div className="pt-4 border-t">
                  <FormLabel className="text-base">BMI Categories</FormLabel>
                  <div className="grid grid-cols-4 gap-2 mt-3 text-center text-xs">
                    <div className="bg-blue-100 text-blue-800 p-2 rounded">
                      <p>Underweight</p>
                      <p className="font-semibold">&lt;18.5</p>
                    </div>
                    <div className="bg-green-100 text-green-800 p-2 rounded">
                      <p>Normal</p>
                      <p className="font-semibold">18.5-24.9</p>
                    </div>
                    <div className="bg-yellow-100 text-yellow-800 p-2 rounded">
                      <p>Overweight</p>
                      <p className="font-semibold">25-29.9</p>
                    </div>
                    <div className="bg-red-100 text-red-800 p-2 rounded">
                      <p>Obesity</p>
                      <p className="font-semibold">30+</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate BMI
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Recent Calculations</CardTitle>
              </div>
              <CardDescription>Your last {history.length} BMI calculations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold">{item.bmi} BMI</p>
                      <p className="text-sm text-muted-foreground capitalize">{item.category}</p>
                    </div>
                    <Badge variant="secondary" className={item.color}>
                      {item.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel - Results */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Your BMI Result</CardTitle>
            <CardDescription>
              Body Mass Index Assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {result ? (
              <div className="space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">Your BMI</p>
                  <p className="text-4xl font-bold text-primary">
                    {result.bmi}
                  </p>
                  <Badge className={`text-lg ${result.color} bg-transparent`}>
                    {result.category}
                  </Badge>
                </div>

                {/* BMI Scale */}
                <div className="space-y-3">
                  <p className="font-semibold text-sm">BMI Scale</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Underweight</span>
                      <span>Normal</span>
                      <span>Overweight</span>
                      <span>Obesity</span>
                    </div>
                    <div className="w-full bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-400 h-2 rounded-full relative">
                      <div 
                        className="absolute top-1/2 w-4 h-4 bg-black rounded-full border-2 border-white -translate-y-1/2"
                        style={{ left: `${Math.min(100, Math.max(0, (result.bmi / 40) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>18.5</span>
                      <span>25</span>
                      <span>30</span>
                      <span>40+</span>
                    </div>
                  </div>
                </div>

                {/* Healthy Weight Range */}
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Healthy Weight Range</p>
                  <p className="text-xl font-semibold">
                    {result.healthyRange.min} - {result.healthyRange.max} kg
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    For your height
                  </p>
                </div>

                {/* Weight to Reach Normal */}
                {result.bmi < 18.5 && (
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Gain {Math.round(result.healthyRange.min - form.watch('weight'))} kg to reach normal weight
                    </p>
                  </div>
                )}
                {result.bmi >= 25 && (
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Lose {Math.round(form.watch('weight') - result.healthyRange.max)} kg to reach normal weight
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4 py-8">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-muted-foreground mb-2">Enter your measurements to see</p>
                  <p className="font-semibold">BMI Assessment</p>
                </div>
              </div>
            )}

            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-4 flex flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Health Insight</CardTitle>
                </CardHeader>
                <CardDescription className="text-left">
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

      {/* Bottom Panel - Education */}
      <div className="lg:col-span-3">
        <Tabs defaultValue="understanding" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="understanding" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Understanding BMI
            </TabsTrigger>
            <TabsTrigger value="limitations" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Limitations
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Health Tips
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="understanding" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">What is BMI?</h4>
                    <p className="text-sm text-muted-foreground">
                      Body Mass Index (BMI) is a simple index of weight-for-height that is commonly used 
                      to classify underweight, overweight, and obesity in adults. It is defined as a 
                      person's weight in kilograms divided by the square of their height in meters.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">BMI Categories</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• <strong>Underweight:</strong> BMI less than 18.5</li>
                        <li>• <strong>Normal weight:</strong> BMI 18.5 to 24.9</li>
                        <li>• <strong>Overweight:</strong> BMI 25 to 29.9</li>
                        <li>• <strong>Obesity:</strong> BMI 30 or greater</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Clinical Use</h4>
                      <p className="text-sm text-muted-foreground">
                        BMI is used by healthcare professionals as a screening tool to identify 
                        potential weight problems. However, it should not be used as a diagnostic 
                        tool for body fatness or health of an individual.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="limitations" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">BMI Limitations</h4>
                    <ul className="text-sm text-muted-foreground space-y-3">
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Muscle Mass:</strong> May overestimate body fat in athletes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Age Factors:</strong> Doesn't account for age-related muscle loss</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Body Composition:</strong> Doesn't distinguish between fat and muscle</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Ethnic Differences:</strong> May not be equally accurate for all ethnic groups</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Better Alternatives</h4>
                    <ul className="text-sm text-muted-foreground space-y-3">
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Waist Circumference:</strong> Measures abdominal fat</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Body Fat Percentage:</strong> More accurate health indicator</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Waist-to-Hip Ratio:</strong> Assesses fat distribution</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                        <span><strong>Blood Tests:</strong> Cholesterol, blood sugar levels</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="health" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Healthy Weight Management</h4>
                    <p className="text-sm text-muted-foreground">
                      Maintaining a healthy weight involves balanced nutrition, regular physical activity, 
                      and sustainable lifestyle habits. Focus on gradual changes rather than quick fixes.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Nutrition Tips</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• Eat plenty of fruits and vegetables</li>
                        <li>• Choose whole grains over refined grains</li>
                        <li>• Include lean protein sources</li>
                        <li>• Limit processed foods and added sugars</li>
                        <li>• Stay hydrated with water</li>
                        <li>• Practice mindful eating</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Activity Recommendations</h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>• 150 minutes moderate exercise per week</li>
                        <li>• Include strength training 2x per week</li>
                        <li>• Increase daily movement (walking, stairs)</li>
                        <li>• Find activities you enjoy</li>
                        <li>• Gradually increase intensity</li>
                        <li>• Listen to your body and rest when needed</li>
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
  );
}