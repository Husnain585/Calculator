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
import { Calculator as CalculatorIcon, Lightbulb, User, Ruler, Weight, Calendar, Activity, Info, Flame } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  age: z.coerce.number().int().min(15, 'Age must be at least 15').max(100, 'Age is too high'),
  gender: z.enum(['male', 'female']),
  height: z.coerce.number().min(100, 'Height must be at least 100 cm').max(250, 'Height is too high'),
  weight: z.coerce.number().min(30, 'Weight must be at least 30 kg').max(300, 'Weight is too high'),
  units: z.enum(['metric', 'imperial']).default('metric'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).default('sedentary'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  bmr: number;
  tdee: number;
  calorieRange: {
    maintenance: number;
    mildLoss: number;
    loss: number;
    extremeLoss: number;
  };
  activityMultipliers: {
    [key: string]: number;
  };
}

export default function BmrCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: 'male',
      age: 30,
      height: undefined,
      weight: undefined,
      units: 'metric',
      activityLevel: 'sedentary',
    },
  });

  const units = form.watch('units');
  const activityLevel = form.watch('activityLevel');

  const activityMultipliers = {
    sedentary: 1.2,      // Little to no exercise
    light: 1.375,        // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    active: 1.725,       // Hard exercise 6-7 days/week
    very_active: 1.9,    // Very hard exercise, physical job
  };

  const calculateBMR = (data: FormValues) => {
    let height = data.height;
    let weight = data.weight;

    // Convert imperial to metric if needed
    if (data.units === 'imperial') {
      // Convert feet/inches to cm
      height = data.height * 2.54;
      // Convert pounds to kg
      weight = data.weight * 0.453592;
    }

    const { age, gender } = data;
    
    let bmr: number;
    // Using Mifflin-St Jeor Equation
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    const tdee = Math.round(bmr * activityMultipliers[data.activityLevel]);
    bmr = Math.round(bmr);

    const calorieRange = {
      maintenance: tdee,
      mildLoss: Math.round(tdee * 0.9),      // 10% deficit
      loss: Math.round(tdee * 0.8),          // 20% deficit
      extremeLoss: Math.round(tdee * 0.7),   // 30% deficit
    };

    return { 
      bmr, 
      tdee,
      calorieRange,
      activityMultipliers 
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const result = calculateBMR(data);
    setResult(result);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'BMR Calculator',
        bmr: result.bmr,
        tdee: result.tdee,
        activityLevel: data.activityLevel,
        age: data.age,
        gender: data.gender
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Your BMR is the baseline calories your body needs at complete rest. To lose weight, aim for 300-500 calories below your TDEE. For muscle gain, aim for 300-500 calories above.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      gender: 'male',
      age: 30,
      height: undefined,
      weight: undefined,
      units: 'metric',
      activityLevel: 'sedentary',
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const activityLevels = [
    { value: 'sedentary', label: 'Sedentary', description: 'Little to no exercise' },
    { value: 'light', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
    { value: 'moderate', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
    { value: 'active', label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
    { value: 'very_active', label: 'Extremely Active', description: 'Very hard exercise & physical job' },
  ];

  const getWeightGoalDescription = (tdee: number) => {
    if (tdee < 1800) return { goal: 'Focus on nutrient density', color: 'text-blue-600' };
    if (tdee < 2200) return { goal: 'Balanced weight management', color: 'text-green-600' };
    if (tdee < 2800) return { goal: 'Active lifestyle maintenance', color: 'text-yellow-600' };
    return { goal: 'High energy requirements', color: 'text-orange-600' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>BMR & TDEE Calculator</CardTitle>
            <CardDescription>
              Calculate your Basal Metabolic Rate and Total Daily Energy Expenditure
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
                            Metric (cm, kg)
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="imperial" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Imperial (inches, lbs)
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
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Age
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 25" {...field} />
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Ruler className="h-4 w-4" />
                          Height ({units === 'metric' ? 'cm' : 'inches'})
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={units === 'metric' ? 'e.g., 180' : 'e.g., 70'} {...field} />
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
                        <FormLabel className="flex items-center gap-2">
                          <Weight className="h-4 w-4" />
                          Weight ({units === 'metric' ? 'kg' : 'lbs'})
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={units === 'metric' ? 'e.g., 75' : 'e.g., 165'} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Activity Level */}
                <FormField
                  control={form.control}
                  name="activityLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Activity Level
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your activity level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activityLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{level.label}</span>
                                <span className="text-xs text-muted-foreground">{level.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Activity Level Reference */}
                <div className="pt-4 border-t">
                  <CardDescription className="flex items-center gap-2 mb-3">
                    <Info className="h-4 w-4" />
                    Activity Multipliers
                  </CardDescription>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    {activityLevels.map((level) => (
                      <Badge key={level.value} variant="outline" className="flex flex-col items-center p-2">
                        <span className="font-semibold">{level.label}</span>
                        <span>×{activityMultipliers[level.value]}</span>
                      </Badge>
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
                  Calculate BMR & TDEE
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Calorie Goals Visualization */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Daily Calorie Targets</CardTitle>
              <CardDescription>
                Recommended calorie intake for different weight goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Weight Maintenance</p>
                    <p className="text-2xl font-bold text-green-700">
                      {result.calorieRange.maintenance} calories
                    </p>
                  </div>
                  <Flame className="h-8 w-8 text-green-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">Mild Weight Loss</p>
                    <p className="text-2xl font-bold text-yellow-700">
                      {result.calorieRange.mildLoss} calories
                    </p>
                    <p className="text-xs text-yellow-600">(~0.25 kg/week)</p>
                  </div>
                  <Activity className="h-8 w-8 text-yellow-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Weight Loss</p>
                    <p className="text-2xl font-bold text-orange-700">
                      {result.calorieRange.loss} calories
                    </p>
                    <p className="text-xs text-orange-600">(~0.5 kg/week)</p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-600" />
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
              <TabsTrigger value="definitions">Definitions</TabsTrigger>
              <TabsTrigger value="strategies">Strategies</TabsTrigger>
            </TabsList>

            <TabsContent value="calculation">
              <Accordion type="single" collapsible>
                <AccordionItem value="formula">
                  <AccordionTrigger>How is BMR calculated?</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>
                        This calculator uses the Mifflin-St Jeor equation, which is considered more accurate than the older Harris-Benedict equation.
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold">For Men:</h4>
                          <div className="font-mono bg-muted p-4 rounded-md my-2 text-sm">
                            BMR = 10 × weight (kg) + 6.25 × height (cm) - 5 × age (y) + 5
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold">For Women:</h4>
                          <div className="font-mono bg-muted p-4 rounded-md my-2 text-sm">
                            BMR = 10 × weight (kg) + 6.25 × height (cm) - 5 × age (y) - 161
                          </div>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">TDEE Calculation</h4>
                        <p className="text-sm text-blue-700">
                          Total Daily Energy Expenditure (TDEE) = BMR × Activity Multiplier
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="definitions">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Flame className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-2">BMR (Basal Metabolic Rate)</h4>
                        <p className="text-sm text-muted-foreground">
                          The number of calories your body needs to perform basic life-sustaining functions like breathing, circulation, and cell production while at complete rest.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Activity className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-semibold mb-2">TDEE (Total Daily Energy Expenditure)</h4>
                        <p className="text-sm text-muted-foreground">
                          The total number of calories you burn each day, including BMR, physical activity, and food digestion (thermic effect of food).
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strategies">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Weight Management Strategies</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="font-medium text-green-600">For Weight Loss</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Create a 300-500 calorie deficit</li>
                          <li>Focus on protein and fiber</li>
                          <li>Combine with regular exercise</li>
                          <li>Track progress weekly</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <div className="font-medium text-blue-600">For Maintenance</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Match intake to TDEE</li>
                          <li>Maintain activity level</li>
                          <li>Monitor weight trends</li>
                          <li>Adjust as needed</li>
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
            <CardTitle>Metabolic Results</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Basal Metabolic Rate (BMR)</p>
                  <p className="text-4xl font-bold text-primary my-2">
                    {result.bmr.toLocaleString()}
                  </p>
                  <p className="text-lg text-muted-foreground">calories/day at rest</p>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Total Daily Energy Expenditure (TDEE)</p>
                  <p className="text-3xl font-bold text-green-600">
                    {result.tdee.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activityLevels.find(l => l.value === activityLevel)?.label}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {getWeightGoalDescription(result.tdee).goal}
                  </Badge>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Activity Multiplier</span>
                    <span className="font-semibold">×{activityMultipliers[activityLevel]}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Age</span>
                    <span className="font-semibold">{form.getValues('age')} years</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Gender</span>
                    <span className="font-semibold capitalize">{form.getValues('gender')}</span>
                  </div>
                </div>

                {/* Energy Breakdown */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Energy Breakdown</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between text-sm mb-1">
                      <span>BMR vs Activity</span>
                      <span>{Math.round((result.bmr / result.tdee) * 100)}% BMR</span>
                    </div>
                    <Progress value={(result.bmr / result.tdee) * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Resting Metabolism</span>
                      <span>Activity & Digestion</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalculatorIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your details to calculate your metabolic rate.
                </p>
              </div>
            )}

            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Smart Advice</CardTitle>
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