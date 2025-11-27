"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, format, differenceInWeeks, differenceInDays } from 'date-fns';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Calculator, Lightbulb, Baby, Heart, AlertTriangle, Info, Clock } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';


const formSchema = z.object({
  lastPeriodDate: z.date({
    required_error: 'Last period date is required.',
  }),
  cycleLength: z.coerce.number().min(21).max(35).default(28),
  calculationMethod: z.enum(['lastPeriod', 'conception']).default('lastPeriod'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  dueDate: string;
  gestationalAge: number;
  trimester: number;
  progressPercentage: number;
  conceptionDate: string;
  currentWeek: number;
  currentDay: number;
}

export default function DueDateCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cycleLength: 28,
      calculationMethod: 'lastPeriod',
    },
  });

  const calculationMethod = form.watch('calculationMethod');

  const getTrimester = (weeks: number) => {
    if (weeks < 14) return 1;
    if (weeks < 28) return 2;
    return 3;
  };

  const getTrimesterColor = (trimester: number) => {
    const colors = {
      1: 'bg-blue-500',
      2: 'bg-green-500',
      3: 'bg-purple-500',
    };
    return colors[trimester as keyof typeof colors];
  };

  const getTrimesterText = (trimester: number) => {
    const texts = {
      1: 'First Trimester',
      2: 'Second Trimester',
      3: 'Third Trimester',
    };
    return texts[trimester as keyof typeof texts];
  };

  const getMilestones = (weeks: number) => {
    const milestones = [
      { week: 8, milestone: 'Heartbeat detectable' },
      { week: 12, milestone: 'First trimester screening' },
      { week: 20, milestone: 'Anatomy scan' },
      { week: 24, milestone: 'Viability milestone' },
      { week: 28, milestone: 'Third trimester begins' },
      { week: 36, milestone: 'Full term' },
    ];
    return milestones.filter(m => m.week <= weeks);
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { lastPeriodDate, cycleLength, calculationMethod } = data;
    
    let dueDate: Date;
    let conceptionDate: Date;

    if (calculationMethod === 'lastPeriod') {
      // Standard calculation: LMP + 280 days
      dueDate = addDays(lastPeriodDate, 280);
      conceptionDate = addDays(lastPeriodDate, cycleLength - 14);
    } else {
      // Conception date method: conception + 266 days
      conceptionDate = lastPeriodDate;
      dueDate = addDays(conceptionDate, 266);
    }

    const gestationalAge = differenceInWeeks(new Date(), lastPeriodDate);
    const daysPregnant = differenceInDays(new Date(), lastPeriodDate);
    const progressPercentage = Math.min((daysPregnant / 280) * 100, 100);
    const trimester = getTrimester(gestationalAge);
    const currentWeek = Math.floor(daysPregnant / 7);
    const currentDay = daysPregnant % 7;

    setResult({
      dueDate: format(dueDate, 'PPP'),
      gestationalAge,
      trimester,
      progressPercentage,
      conceptionDate: format(conceptionDate, 'PPP'),
      currentWeek,
      currentDay,
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const result = await suggestNextStep({ 
        calculatorName: 'Due Date Calculator',
        gestationalAge,
        trimester,
        dueDate: format(dueDate, 'PPP')
      });
      setSuggestion(result.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Every pregnancy is unique. Use this estimate as a guide and be sure to consult with your healthcare provider for accurate tracking and prenatal care.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      lastPeriodDate: undefined,
      cycleLength: 28,
      calculationMethod: 'lastPeriod',
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const trimester = result ? result.trimester : 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Due Date Calculator</CardTitle>
            <CardDescription>
              Calculate your estimated due date and track pregnancy progress
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="calculationMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Calculation Method</FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-4">
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="radio"
                                className="hidden peer"
                                checked={field.value === 'lastPeriod'}
                                onChange={() => field.onChange('lastPeriod')}
                              />
                            </FormControl>
                            <label
                              className={cn(
                                "flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all",
                                "peer-checked:border-primary peer-checked:bg-primary/5",
                                "border-muted hover:border-muted-foreground/50"
                              )}
                            >
                              <div className="font-medium">Last Period</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Based on first day of last menstrual period
                              </div>
                            </label>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="radio"
                                className="hidden peer"
                                checked={field.value === 'conception'}
                                onChange={() => field.onChange('conception')}
                              />
                            </FormControl>
                            <label
                              className={cn(
                                "flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all",
                                "peer-checked:border-primary peer-checked:bg-primary/5",
                                "border-muted hover:border-muted-foreground/50"
                              )}
                            >
                              <div className="font-medium">Conception Date</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Based on known conception date
                              </div>
                            </label>
                          </FormItem>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastPeriodDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        {calculationMethod === 'lastPeriod' 
                          ? 'First Day of Last Menstrual Period' 
                          : 'Conception Date'}
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP')
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {calculationMethod === 'lastPeriod' && (
                  <FormField
                    control={form.control}
                    name="cycleLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Average Cycle Length (days)</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {/* <Input 
                              type="number" 
                              min="21" 
                              max="35" 
                              {...field} 
                            /> */}
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Shorter (21 days)</span>
                              <span>Average (28 days)</span>
                              <span>Longer (35 days)</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <Calculator className="mr-2 h-4 w-4" /> Calculate Due Date
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Pregnancy Progress */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Pregnancy Progress</CardTitle>
              <CardDescription>
                Track your pregnancy journey and upcoming milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to Due Date</span>
                    <span>{result.progressPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={result.progressPercentage} className="h-2" />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold">{result.currentWeek}</p>
                    <p className="text-xs text-muted-foreground">Weeks</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold">{result.currentDay}</p>
                    <p className="text-xs text-muted-foreground">Days</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold">{result.gestationalAge}</p>
                    <p className="text-xs text-muted-foreground">Total Weeks</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-3">Recent Milestones</h4>
                  <div className="space-y-2">
                    {getMilestones(result.gestationalAge).slice(-3).map((milestone, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <div>
                          <p className="text-sm font-medium">Week {milestone.week}</p>
                          <p className="text-xs text-muted-foreground">{milestone.milestone}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
            <CardTitle>Pregnancy Timeline</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Due Date</p>
                  <p className="text-3xl font-bold my-2 text-primary">{result.dueDate}</p>
                  <Badge className={`${getTrimesterColor(trimester)} text-white`}>
                    {getTrimesterText(trimester)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Conception Date</p>
                    <p className="font-semibold text-sm">{result.conceptionDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gestational Age</p>
                    <p className="font-semibold">{result.gestationalAge} weeks</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Current Progress</p>
                  <p className="text-2xl font-semibold">{result.currentWeek}w {result.currentDay}d</p>
                  <p className="text-sm text-muted-foreground">
                    {40 - result.gestationalAge} weeks remaining
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Pregnancy Stage</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {trimester === 1 ? 'First trimester focus: prenatal vitamins, managing early symptoms, and initial screenings.' :
                     trimester === 2 ? 'Second trimester: typically more energy, anatomy scan, and feeling baby movements.' :
                     'Third trimester: final preparations, frequent check-ups, and watching for labor signs.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Baby className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your pregnancy details to calculate your due date and track progress.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Pregnancy Tip</CardTitle>
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
            <TabsTrigger value="timeline">Pregnancy Timeline</TabsTrigger>
            <TabsTrigger value="considerations">Important Notes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculation">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is the due date estimated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      Due dates are estimated using established medical formulas that calculate forward 
                      from either the last menstrual period or conception date, assuming a typical 40-week pregnancy.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Last Period Method (Naegele's Rule)</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          Due Date = First Day of Last Period + 280 Days
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Most common method used by healthcare providers
                        </p>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">Conception Date Method</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            Due Date = Conception Date + 266 Days
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Used when conception date is known
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Cycle Adjustment</h4>
                          <div className="font-mono bg-muted p-3 rounded-md text-xs">
                            Adjusted Date = LMP + 280 + (Cycle Length - 28)
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            For women with regular cycles not 28 days
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Trimesters Breakdown</h4>
                        <div className="text-sm space-y-2">
                          <p><strong>First Trimester:</strong> Weeks 1-13 (Months 1-3)</p>
                          <p><strong>Second Trimester:</strong> Weeks 14-27 (Months 4-6)</p>
                          <p><strong>Third Trimester:</strong> Weeks 28-40 (Months 7-9)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Pregnancy Development Timeline</h3>
                <div className="space-y-4">
                  {[
                    {
                      trimester: "First Trimester (Weeks 1-13)",
                      developments: [
                        "Baby's heart begins beating (week 6)",
                        "Major organs start forming",
                        "Fingers and toes develop",
                        "First trimester screening"
                      ],
                      care: "Start prenatal vitamins, first OB visit"
                    },
                    {
                      trimester: "Second Trimester (Weeks 14-27)",
                      developments: [
                        "Baby's movements felt (quickening)",
                        "Sex can be determined",
                        "Hearing develops",
                        "Anatomy scan (week 20)"
                      ],
                      care: "Increased energy, glucose screening"
                    },
                    {
                      trimester: "Third Trimester (Weeks 28-40)",
                      developments: [
                        "Rapid weight gain",
                        "Lungs mature",
                        "Baby positions for birth",
                        "Braxton Hicks contractions"
                      ],
                      care: "Weekly visits, birth plan preparation"
                    }
                  ].map((stage, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-3 h-3 rounded-full ${getTrimesterColor(index + 1)}`} />
                        <h4 className="font-semibold">{stage.trimester}</h4>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium mb-2">Baby's Development</p>
                          <ul className="space-y-1 text-muted-foreground">
                            {stage.developments.map((item, idx) => (
                              <li key={idx}>• {item}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium mb-2">Maternal Care</p>
                          <p className="text-muted-foreground">{stage.care}</p>
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
                  <h3 className="font-semibold">Important Pregnancy Considerations</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <p>When using due date calculators and tracking your pregnancy, remember:</p>
                  <ul className="space-y-2 list-disc list-inside">
                    <li><strong>Estimated Date:</strong> Only 5% of babies are born on their exact due date</li>
                    <li><strong>Ultrasound Accuracy:</strong> Early ultrasounds (8-13 weeks) are most accurate for dating</li>
                    <li><strong>Medical Consultation:</strong> Always confirm with your healthcare provider</li>
                    <li><strong>Individual Variation:</strong> Every pregnancy progresses differently</li>
                    <li><strong>Symptom Tracking:</strong> Report any concerning symptoms to your doctor immediately</li>
                    <li><strong>Prenatal Care:</strong> Regular check-ups are essential for monitoring health</li>
                  </ul>
                  <p className="font-medium mt-4">
                    This calculator provides estimates for educational purposes. For medical advice, 
                    diagnosis, and prenatal care, always consult with qualified healthcare professionals. 
                    Contact your doctor immediately if you experience any concerning symptoms.
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