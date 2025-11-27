"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { differenceInYears, differenceInMonths, differenceInDays, format, getDay, isAfter, isBefore, isSameDay, addYears, addMonths, addDays, isLeapYear, getDaysInYear } from 'date-fns';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Calculator, Lightbulb, Cake, Gift, Clock, Star, Target, Zap, Heart } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  dob: z.date({
    required_error: 'A date of birth is required.',
  }),
  includeTime: z.boolean().default(false),
  birthTime: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalMonths: number;
  totalWeeks: number;
  birthDay: string;
  nextBirthday: string;
  daysUntilNextBirthday: number;
  zodiacSign: string;
  generation: string;
  isLeapYearBaby: boolean;
  ageInHours?: number;
  ageInMinutes?: number;
}

export default function DobCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      includeTime: false,
    },
  });

  const includeTime = form.watch('includeTime');

  const getZodiacSign = (month: number, day: number) => {
    const signs = [
      { name: 'Capricorn', start: [12, 22], end: [1, 19] },
      { name: 'Aquarius', start: [1, 20], end: [2, 18] },
      { name: 'Pisces', start: [2, 19], end: [3, 20] },
      { name: 'Aries', start: [3, 21], end: [4, 19] },
      { name: 'Taurus', start: [4, 20], end: [5, 20] },
      { name: 'Gemini', start: [5, 21], end: [6, 20] },
      { name: 'Cancer', start: [6, 21], end: [7, 22] },
      { name: 'Leo', start: [7, 23], end: [8, 22] },
      { name: 'Virgo', start: [8, 23], end: [9, 22] },
      { name: 'Libra', start: [9, 23], end: [10, 22] },
      { name: 'Scorpio', start: [10, 23], end: [11, 21] },
      { name: 'Sagittarius', start: [11, 22], end: [12, 21] },
    ];
    
    const sign = signs.find(s => 
      (month === s.start[0] && day >= s.start[1]) || 
      (month === s.end[0] && day <= s.end[1])
    );
    
    return sign?.name || 'Unknown';
  };

  const getGeneration = (year: number) => {
    if (year >= 2013) return 'Generation Alpha';
    if (year >= 1997) return 'Generation Z';
    if (year >= 1981) return 'Millennials';
    if (year >= 1965) return 'Generation X';
    if (year >= 1946) return 'Baby Boomers';
    if (year >= 1928) return 'Silent Generation';
    return 'Greatest Generation';
  };

  const calculateAge = (data: FormValues) => {
    const now = new Date();
    const dob = data.dob;

    if (isAfter(dob, now)) {
      form.setError('dob', {
        type: 'manual',
        message: 'Date of birth cannot be in the future.',
      });
      setResult(null);
      return;
    }

    const years = differenceInYears(now, dob);
    let tempDate = new Date(dob);
    tempDate.setFullYear(tempDate.getFullYear() + years);
    
    const months = differenceInMonths(now, tempDate);
    tempDate = new Date(dob);
    tempDate.setFullYear(tempDate.getFullYear() + years);
    tempDate.setMonth(tempDate.getMonth() + months);
    
    const days = differenceInDays(now, tempDate);

    // Calculate totals
    const totalDays = differenceInDays(now, dob);
    const totalMonths = differenceInMonths(now, dob);
    const totalWeeks = Math.floor(totalDays / 7);

    const dayOfWeek = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const birthDay = dayOfWeek[getDay(dob)];

    // Calculate next birthday
    let nextBirthday = new Date(dob);
    nextBirthday.setFullYear(now.getFullYear());
    if (isAfter(nextBirthday, now) || isSameDay(nextBirthday, now)) {
      // Birthday this year hasn't happened yet or is today
      nextBirthday.setFullYear(now.getFullYear());
    } else {
      // Birthday this year has passed
      nextBirthday.setFullYear(now.getFullYear() + 1);
    }
    const daysUntilNextBirthday = differenceInDays(nextBirthday, now);

    // Get zodiac sign
    const zodiacSign = getZodiacSign(dob.getMonth() + 1, dob.getDate());

    // Get generation
    const generation = getGeneration(dob.getFullYear());

    // Check if born in leap year
    const isLeapYearBaby = isLeapYear(dob);

    // Calculate age in hours and minutes if time is included
    let ageInHours, ageInMinutes;
    if (data.includeTime && data.birthTime) {
      const [hours, minutes] = data.birthTime.split(':').map(Number);
      const birthDateTime = new Date(dob);
      birthDateTime.setHours(hours, minutes);
      const diffMs = now.getTime() - birthDateTime.getTime();
      ageInHours = Math.floor(diffMs / (1000 * 60 * 60));
      ageInMinutes = Math.floor(diffMs / (1000 * 60));
    }

    return { 
      years, 
      months, 
      days,
      totalDays,
      totalMonths,
      totalWeeks,
      birthDay,
      nextBirthday: format(nextBirthday, 'MMMM do, yyyy'),
      daysUntilNextBirthday,
      zodiacSign,
      generation,
      isLeapYearBaby,
      ageInHours,
      ageInMinutes
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const result = calculateAge(data);
    setResult(result as Result);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const result = await suggestNextStep({ 
        calculatorName: 'Date of Birth Calculator',
        years: result.years,
        daysUntilNextBirthday: result.daysUntilNextBirthday,
        zodiacSign: result.zodiacSign,
        generation: result.generation
      });
      setSuggestion(result.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Did you know you can also calculate the time until your next birthday? Planning a celebration early is always a good idea!");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      dob: undefined,
      includeTime: false,
      birthTime: undefined,
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const getBirthstone = (month: number) => {
    const birthstones = [
      'Garnet', 'Amethyst', 'Aquamarine', 'Diamond', 'Emerald', 'Pearl',
      'Ruby', 'Peridot', 'Sapphire', 'Opal', 'Topaz', 'Turquoise'
    ];
    return birthstones[month - 1];
  };

  const getSeason = (month: number) => {
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Autumn';
    return 'Winter';
  };

  const milestoneAges = [
    { age: 13, milestone: 'Becomes a teenager' },
    { age: 16, milestone: 'Can get driver\'s license in many places' },
    { age: 18, milestone: 'Legal adulthood in most countries' },
    { age: 21, milestone: 'Legal drinking age in some countries' },
    { age: 30, milestone: 'Pearl anniversary of birth' },
    { age: 40, milestone: 'Ruby anniversary of birth' },
    { age: 50, milestone: 'Golden anniversary of birth' },
    { age: 60, milestone: 'Diamond anniversary of birth' },
    { age: 65, milestone: 'Traditional retirement age' },
    { age: 100, milestone: 'Centenarian' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Age Calculator</CardTitle>
            <CardDescription>
              Discover your exact age and learn interesting facts about your birth date
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center gap-2">
                        <Cake className="h-4 w-4" />
                        Date of Birth
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
                                <span>Pick your birth date</span>
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
                            disabled={(date) =>
                              isAfter(date, new Date()) ||
                              isAfter(date, new Date('2400-01-01'))
                            }
                            initialFocus
                            captionLayout="dropdown-buttons"
                            fromYear={1900}
                            toYear={new Date().getFullYear()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Optional Time Input */}
                <FormField
                  control={form.control}
                  name="includeTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      {/* <div className="space-y-1 leading-none">
                        <FormLabel>Include exact birth time</FormLabel>
                        <FormDescription>
                          Get more precise age calculation including hours and minutes
                        </FormDescription>
                      </div> */}
                    </FormItem>
                  )}
                />

                {includeTime && (
                  <FormField
                    control={form.control}
                    name="birthTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Time of Birth
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Quick Facts Preview */}
                {form.watch('dob') && (
                  <div className="pt-4 border-t">
                    <CardDescription className="flex items-center gap-2 mb-3">
                      <Star className="h-4 w-4" />
                      Birth Date Facts
                    </CardDescription>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <Badge variant="outline" className="flex flex-col items-center p-2">
                        <span>Season</span>
                        <span className="font-semibold">
                          {getSeason(form.watch('dob').getMonth() + 1)}
                        </span>
                      </Badge>
                      <Badge variant="outline" className="flex flex-col items-center p-2">
                        <span>Birthstone</span>
                        <span className="font-semibold">
                          {getBirthstone(form.watch('dob').getMonth() + 1)}
                        </span>
                      </Badge>
                      <Badge variant="outline" className="flex flex-col items-center p-2">
                        <span>Zodiac</span>
                        <span className="font-semibold">
                          {getZodiacSign(form.watch('dob').getMonth() + 1, form.watch('dob').getDate())}
                        </span>
                      </Badge>
                      <Badge variant="outline" className="flex flex-col items-center p-2">
                        <span>Leap Year</span>
                        <span className="font-semibold">
                          {isLeapYear(form.watch('dob')) ? 'Yes' : 'No'}
                        </span>
                      </Badge>
                    </div>
                  </div>
                )}
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
                  <Calculator className="mr-2 h-4 w-4" /> Calculate Age
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Detailed Age Breakdown */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Age Breakdown</CardTitle>
              <CardDescription>
                Your age in different units and time measurements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Days Lived</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {result.totalDays.toLocaleString()} days
                    </p>
                  </div>
                  <CalendarIcon className="h-8 w-8 text-blue-600" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Months</p>
                    <p className="text-xl font-bold">{result.totalMonths.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Weeks</p>
                    <p className="text-xl font-bold">{result.totalWeeks.toLocaleString()}</p>
                  </div>
                </div>

                {result.ageInHours && result.ageInMinutes && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-600">Hours Lived</p>
                      <p className="text-xl font-bold text-green-700">
                        {result.ageInHours.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-600">Minutes Lived</p>
                      <p className="text-xl font-bold text-purple-700">
                        {result.ageInMinutes.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Educational Content */}
        <div className="mt-8">
          <Tabs defaultValue="calculation" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calculation">Calculation</TabsTrigger>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="facts">Birth Facts</TabsTrigger>
            </TabsList>

            <TabsContent value="calculation">
              <Accordion type="single" collapsible>
                <AccordionItem value="formula">
                  <AccordionTrigger>How is age calculated?</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>
                        Age is calculated by determining the total number of full years, months, and days that have passed between the date of birth and the current date. The calculation is done sequentially to ensure accuracy.
                      </p>
                      
                      <div className="bg-muted p-4 rounded-md">
                        <h4 className="font-semibold mb-2">Calculation Steps:</h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                          <li>Calculate full years between dates</li>
                          <li>Calculate remaining months after accounting for years</li>
                          <li>Calculate remaining days after accounting for years and months</li>
                          <li>Handle leap years and month length variations automatically</li>
                        </ol>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">Fun Fact</h4>
                        <p className="text-sm text-blue-700">
                          If you were born on February 29th (leap day), you technically only have a birthday every four years!
                          Most leap day babies celebrate on February 28th or March 1st in non-leap years.
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="milestones">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Life Milestones</h4>
                    <div className="space-y-3">
                      {milestoneAges.map((milestone, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{milestone.age} years</div>
                            <div className="text-sm text-muted-foreground">{milestone.milestone}</div>
                          </div>
                          {result && (
                            <Badge variant={result.years >= milestone.age ? "default" : "outline"}>
                              {result.years >= milestone.age ? 'Achieved' : 'Future'}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="facts">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Birth Date Significance</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="font-medium text-purple-600">Astrological</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Zodiac signs based on birth date</li>
                          <li>Chinese zodiac animals</li>
                          <li>Birthstones by month</li>
                          <li>Seasonal characteristics</li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <div className="font-medium text-green-600">Historical</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Generational classifications</li>
                          <li>Historical events on your birthday</li>
                          <li>Famous people who share your birthday</li>
                          <li>Cultural celebrations</li>
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
            <CardTitle>Your Age Results</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Your Current Age</p>
                  <p className="text-5xl font-bold text-primary my-2">
                    {result.years}
                  </p>
                  <p className="text-lg text-muted-foreground">Years Old</p>
                </div>

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-semibold">{result.months}</p>
                      <p className="text-sm text-muted-foreground">Months</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{result.days}</p>
                      <p className="text-sm text-muted-foreground">Days</p>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold">{result.totalWeeks}</p>
                      <p className="text-sm text-muted-foreground">Weeks</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Next Birthday</span>
                    <span className="font-semibold text-blue-600">{result.nextBirthday}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Days Until</span>
                    <span className="font-semibold text-green-600">{result.daysUntilNextBirthday} days</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Born on</span>
                    <span className="font-semibold">{result.birthDay}</span>
                  </div>
                </div>

                {/* Personal Facts */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm font-medium">Personal Facts</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Zodiac Sign</span>
                      <span className="font-semibold">{result.zodiacSign}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Generation</span>
                      <span className="font-semibold">{result.generation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Leap Year Baby</span>
                      <span className="font-semibold">{result.isLeapYearBaby ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                {/* Next Birthday Progress */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Target className="h-4 w-4 text-orange-500" />
                    <p className="text-sm font-medium">Year Progress</p>
                  </div>
                  <div className="space-y-2">
                    <Progress value={(365 - result.daysUntilNextBirthday) / 365 * 100} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Last Birthday</span>
                      <span>{Math.round((365 - result.daysUntilNextBirthday) / 365 * 100)}%</span>
                      <span>Next Birthday</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Cake className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your birth date to discover your age and personal facts.
                </p>
              </div>
            )}

            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Fun Fact</CardTitle>
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