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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calculator as CalculatorIcon, Lightbulb, User, Activity, Scale, TrendingDown, AlertTriangle, Info, Heart } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';

const formSchema = z.object({
  age: z.coerce.number().int().min(15, 'Age must be at least 15').max(80, 'Age must be 80 or less'),
  gender: z.enum(['male', 'female']),
  height: z.coerce.number().positive('Height must be positive'),
  weight: z.coerce.number().positive('Weight must be positive'),
  activityLevel: z.string(),
  goal: z.enum(['maintain', 'lose', 'gain']).default('maintain'),
  unitSystem: z.enum(['metric', 'imperial']).default('metric'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  maintenance: number;
  mildLoss: number;
  weightLoss: number;
  extremeLoss: number;
  mildGain: number;
  weightGain: number;
  bmr: number;
  goalCalories: number;
}

const activityMultipliers: { [key: string]: { value: number; description: string } } = {
  sedentary: { value: 1.2, description: 'Little or no exercise' },
  light: { value: 1.375, description: 'Light exercise 1-3 days/week' },
  moderate: { value: 1.55, description: 'Moderate exercise 3-5 days/week' },
  active: { value: 1.725, description: 'Hard exercise 6-7 days/week' },
  extra: { value: 1.9, description: 'Very hard exercise & physical job' },
};

export default function CalorieCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: 'male',
      activityLevel: 'moderate',
      age: undefined,
      height: undefined,
      weight: undefined,
      goal: 'maintain',
      unitSystem: 'metric',
    },
  });

  const unitSystem = form.watch('unitSystem');
  const goal = form.watch('goal');
  const activityLevel = form.watch('activityLevel');

  const getGoalColor = (goalType: string) => {
    const colors = {
      'maintain': 'bg-blue-500',
      'lose': 'bg-green-500',
      'gain': 'bg-orange-500',
    };
    return colors[goalType as keyof typeof colors];
  };

  const getGoalText = (goalType: string) => {
    const texts = {
      'maintain': 'Maintain Weight',
      'lose': 'Lose Weight',
      'gain': 'Gain Weight',
    };
    return texts[goalType as keyof typeof texts];
  };

  const getActivityLevelDescription = (level: string) => {
    return activityMultipliers[level]?.description || '';
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { age, gender, height, weight, activityLevel, goal, unitSystem } = data;
    
    // Convert to metric if imperial
    let heightCm = height;
    let weightKg = weight;
    
    if (unitSystem === 'imperial') {
      // Convert feet/inches to cm, pounds to kg
      heightCm = height * 2.54; // inches to cm
      weightKg = weight * 0.453592; // pounds to kg
    }
    
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }

    const maintenance = bmr * activityMultipliers[activityLevel].value;

    // Calculate goal-specific calories
    let goalCalories = maintenance;
    if (goal === 'lose') {
      goalCalories = maintenance - 500;
    } else if (goal === 'gain') {
      goalCalories = maintenance + 500;
    }

    setResult({
      maintenance: Math.round(maintenance),
      mildLoss: Math.round(maintenance - 250),
      weightLoss: Math.round(maintenance - 500),
      extremeLoss: Math.round(maintenance - 1000),
      mildGain: Math.round(maintenance + 250),
      weightGain: Math.round(maintenance + 500),
      bmr: Math.round(bmr),
      goalCalories: Math.round(goalCalories),
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Calorie Calculator',
        maintenanceCalories: Math.round(maintenance),
        goal,
        activityLevel,
        bmr: Math.round(bmr)
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Remember to listen to your body. These numbers are estimates; adjust based on your progress and energy levels. Consider tracking your food intake for better accuracy.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      gender: 'male',
      activityLevel: 'moderate',
      age: undefined,
      height: undefined,
      weight: undefined,
      goal: 'maintain',
      unitSystem: 'metric',
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const activityInfo = activityMultipliers[activityLevel];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Calorie Calculator</CardTitle>
            <CardDescription>
              Calculate your daily calorie needs for weight maintenance, loss, or gain
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="unitSystem"
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
                          <SelectItem value="imperial">Imperial (inches, lbs)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              placeholder="e.g., 25" 
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
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Gender</FormLabel>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Height ({unitSystem === 'metric' ? 'cm' : 'inches'})
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              placeholder={unitSystem === 'metric' ? "e.g., 180" : "e.g., 70"} 
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
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Weight ({unitSystem === 'metric' ? 'kg' : 'lbs'})
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Scale className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="number" 
                              placeholder={unitSystem === 'metric' ? "e.g., 75" : "e.g., 165"} 
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

                <FormField
                  control={form.control}
                  name="activityLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        Activity Level
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your daily activity level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(activityMultipliers).map(([key, { description }]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex flex-col">
                                <span className="font-medium capitalize">{key}</span>
                                <span className="text-sm text-muted-foreground">{description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        Your Goal
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-3 gap-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="lose" />
                            </FormControl>
                            <FormLabel className="font-normal">Lose Weight</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="maintain" />
                            </FormControl>
                            <FormLabel className="font-normal">Maintain</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="gain" />
                            </FormControl>
                            <FormLabel className="font-normal">Gain Weight</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate Calories
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Calorie Breakdown Visualization */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Calorie Breakdown</CardTitle>
              <CardDescription>
                Understand how your calories are distributed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Basal Metabolic Rate (BMR)</span>
                  <span className="font-semibold">{result.bmr.toLocaleString()} cal</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Activity Multiplier</span>
                  <span className="font-semibold">{activityInfo.value}x</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ 
                      width: `${(result.bmr / result.maintenance) * 100}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>BMR: {((result.bmr / result.maintenance) * 100).toFixed(1)}%</span>
                  <span>Activity: {((1 - result.bmr / result.maintenance) * 100).toFixed(1)}%</span>
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
            <CardTitle>Your Calorie Targets</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Recommended Daily Intake</p>
                  <p className="text-5xl font-bold my-2">{result.goalCalories.toLocaleString()}</p>
                  <p className="text-lg font-semibold text-primary">calories/day</p>
                  <Badge className={`${getGoalColor(goal)} text-white mt-2`}>
                    {getGoalText(goal)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Maintenance</p>
                    <p className="font-semibold">{result.maintenance.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">cal/day</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">BMR</p>
                    <p className="font-semibold">{result.bmr.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">cal/day</p>
                  </div>
                </div>

                {goal === 'lose' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Weight Loss Options</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <p className="font-semibold">{result.mildLoss.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Mild (0.25kg/wk)</p>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <p className="font-semibold">{result.weightLoss.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Standard (0.5kg/wk)</p>
                      </div>
                    </div>
                  </div>
                )}

                {goal === 'gain' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Weight Gain Options</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <p className="font-semibold">{result.mildGain.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Slow (0.25kg/wk)</p>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded">
                        <p className="font-semibold">{result.weightGain.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Standard (0.5kg/wk)</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">What this means</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {goal === 'maintain' ? 'Maintain your current weight with this calorie intake. Adjust based on your weekly progress.' :
                     goal === 'lose' ? 'Create a calorie deficit for weight loss. Combine with exercise for best results and muscle preservation.' :
                     'Create a calorie surplus for weight gain. Include strength training to build muscle rather than fat.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your details to calculate your daily calorie needs.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Nutrition Tip</CardTitle>
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
            <TabsTrigger value="nutrition">Nutrition Guide</TabsTrigger>
            <TabsTrigger value="considerations">Important Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How are daily calorie needs calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      This calculator uses the Mifflin-St Jeor equation to determine your Basal Metabolic Rate (BMR), 
                      then applies an activity multiplier to estimate your Total Daily Energy Expenditure (TDEE).
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Mifflin-St Jeor Equation</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(y) + s
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Where s = +5 for men, -161 for women
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">TDEE Calculation</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            TDEE = BMR × Activity Multiplier
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Your total daily energy expenditure including activity
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Goal Adjustment</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            Goal Calories = TDEE ± Deficit/Surplus
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            -500 for weight loss, +500 for weight gain
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Activity Multipliers</h4>
                        <div className="text-sm space-y-1">
                          <p>• Sedentary: 1.2 (little or no exercise)</p>
                          <p>• Light: 1.375 (light exercise 1-3 days/week)</p>
                          <p>• Moderate: 1.55 (moderate exercise 3-5 days/week)</p>
                          <p>• Active: 1.725 (hard exercise 6-7 days/week)</p>
                          <p>• Extra Active: 1.9 (very hard exercise & physical job)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="nutrition">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Smart Nutrition Strategies</h3>
                <div className="space-y-4">
                  {[
                    {
                      strategy: "Prioritize Protein",
                      description: "Aim for 1.6-2.2g of protein per kg of body weight to support muscle maintenance during weight loss or growth during weight gain.",
                      benefit: "Muscle preservation"
                    },
                    {
                      strategy: "Focus on Whole Foods",
                      description: "Choose nutrient-dense foods like vegetables, fruits, lean proteins, and whole grains over processed options.",
                      benefit: "Better nutrition"
                    },
                    {
                      strategy: "Stay Hydrated",
                      description: "Drink 2-3 liters of water daily. Sometimes thirst is mistaken for hunger.",
                      benefit: "Appetite control"
                    },
                    {
                      strategy: "Track Consistently",
                      description: "Use a food tracking app for 2-4 weeks to understand your eating patterns and portion sizes.",
                      benefit: "Awareness"
                    },
                    {
                      strategy: "Plan Your Meals",
                      description: "Prepare meals in advance to avoid impulsive food choices and ensure you meet your calorie targets.",
                      benefit: "Consistency"
                    }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4 py-3 border-b">
                      <Badge 
                        variant="outline" 
                        className="whitespace-nowrap border-green-200 bg-green-50"
                      >
                        {item.benefit}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{item.strategy}</p>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
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
                  <h3 className="font-semibold">Important Health Considerations</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <p>When using calorie calculators and planning your nutrition, remember:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Individual Variation:</strong> These are estimates - your actual needs may vary by ±15%</li>
                    <li><strong>Medical Conditions:</strong> Consult a doctor if you have diabetes, thyroid issues, or other health conditions</li>
                    <li><strong>Sustainable Approach:</strong> Avoid extreme calorie restrictions - very low intake can slow metabolism</li>
                    <li><strong>Nutrient Quality:</strong> 1,200 calories of junk food ≠ 1,200 calories of nutrient-dense food</li>
                    <li><strong>Exercise Impact:</strong> As you lose weight and exercise more, your calorie needs will change</li>
                    <li><strong>Mental Health:</strong> Don't let tracking become obsessive - focus on overall patterns, not daily perfection</li>
                  </ul>
                  <p className="font-medium mt-4">
                    This calculator provides estimates for healthy adults. For personalized advice, 
                    consider consulting with a registered dietitian or nutritionist, especially if you have specific health goals or conditions.
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