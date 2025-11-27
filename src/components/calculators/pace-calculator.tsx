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
import { Calculator as CalculatorIcon, Lightbulb, Footprints, Clock, MapPin, TrendingUp, Award, Target, Info } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const formSchema = z.object({
  distance: z.coerce.number().min(0.1, 'Distance must be at least 0.1 km').max(1000, 'Distance is too long'),
  hours: z.coerce.number().min(0).int(),
  minutes: z.coerce.number().min(0).max(59).int(),
  seconds: z.coerce.number().min(0).max(59).int(),
  units: z.enum(['metric', 'imperial']).default('metric'),
  activityType: z.enum(['running', 'walking', 'cycling', 'swimming']).default('running'),
}).refine(data => data.hours > 0 || data.minutes > 0 || data.seconds > 0, {
  message: 'Total time must be greater than zero.',
  path: ['hours'],
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  paceMinPerKm: string;
  paceMinPerMile: string;
  speedKmh: number;
  speedMph: number;
  totalTime: string;
  paceCategory: string;
  equivalentTimes: { distance: string; time: string }[];
}

export default function PaceCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      distance: 5,
      hours: 0,
      minutes: 25,
      seconds: 0,
      units: 'metric',
      activityType: 'running',
    }
  });

  const units = form.watch('units');
  const activityType = form.watch('activityType');

  const getPaceCategory = (paceMinPerKm: number) => {
    if (paceMinPerKm < 4) return { category: 'Elite', color: 'bg-purple-500', description: 'Competitive athlete level' };
    if (paceMinPerKm < 5) return { category: 'Advanced', color: 'bg-red-500', description: 'Experienced runner' };
    if (paceMinPerKm < 6) return { category: 'Intermediate', color: 'bg-orange-500', description: 'Regular runner' };
    if (paceMinPerKm < 7) return { category: 'Recreational', color: 'bg-green-500', description: 'Fitness enthusiast' };
    return { category: 'Beginner', color: 'bg-blue-500', description: 'Getting started' };
  };

  const calculateEquivalentTimes = (paceMinPerKm: number) => {
    const distances = [
      { name: '1 km', distance: 1 },
      { name: '5 km', distance: 5 },
      { name: '10 km', distance: 10 },
      { name: 'Half Marathon', distance: 21.1 },
      { name: 'Marathon', distance: 42.2 },
    ];

    return distances.map(({ name, distance }) => {
      const totalSeconds = paceMinPerKm * 60 * distance;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);

      let timeString = '';
      if (hours > 0) timeString += `${hours}h `;
      timeString += `${minutes}m`;
      if (seconds > 0) timeString += ` ${seconds}s`;

      return { distance: name, time: timeString };
    });
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    let distanceKm = data.distance;

    // Convert imperial to metric if needed
    if (data.units === 'imperial') {
      distanceKm = data.distance * 1.60934; // miles to km
    }

    const { hours, minutes, seconds } = data;
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    
    // Pace in seconds per km
    const secondsPerKm = totalSeconds / distanceKm;
    const paceMinPerKm = Math.floor(secondsPerKm / 60);
    const paceSecPerKm = Math.round(secondsPerKm % 60);

    // Pace in seconds per mile
    const distanceMiles = distanceKm * 0.621371;
    const secondsPerMile = totalSeconds / distanceMiles;
    const paceMinPerMile = Math.floor(secondsPerMile / 60);
    const paceSecPerMile = Math.round(secondsPerMile % 60);

    // Calculate speed
    const speedKmh = distanceKm / (totalSeconds / 3600);
    const speedMph = distanceMiles / (totalSeconds / 3600);

    // Total time formatted
    const totalTime = `${hours > 0 ? `${hours}h ` : ''}${minutes}m${seconds > 0 ? ` ${seconds}s` : ''}`;

    // Get pace category
    const paceCategoryInfo = getPaceCategory(paceMinPerKm + paceSecPerKm / 60);

    // Calculate equivalent times for other distances
    const equivalentTimes = calculateEquivalentTimes(paceMinPerKm + paceSecPerKm / 60);

    setResult({
      paceMinPerKm: `${paceMinPerKm}:${paceSecPerKm.toString().padStart(2, '0')}`,
      paceMinPerMile: `${paceMinPerMile}:${paceSecPerMile.toString().padStart(2, '0')}`,
      speedKmh,
      speedMph,
      totalTime,
      paceCategory: paceCategoryInfo.category,
      equivalentTimes
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'Pace Calculator',
        loanType: 'personal',
        pacePerKm: `${paceMinPerKm}:${paceSecPerKm.toString().padStart(2, '0')}`,
        paceCategory: paceCategoryInfo.category,
        activityType: data.activityType,
        distance: distanceKm
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Consistency is key! Try to maintain a similar pace for your next run to build endurance. Consider doing interval training once a week to improve your speed.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      distance: 5,
      hours: 0,
      minutes: 25,
      seconds: 0,
      units: 'metric',
      activityType: 'running',
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const commonDistances = [
    { label: '5K', value: 5, description: 'Parkrun distance' },
    { label: '10K', value: 10, description: 'Popular race' },
    { label: 'Half Marathon', value: 21.1, description: '21.1 km' },
    { label: 'Marathon', value: 42.2, description: '42.2 km' },
  ];

  const paceStandards = [
    { category: 'Beginner', pace: '7:00+', effort: 'Comfortable conversation' },
    { category: 'Recreational', pace: '6:00-7:00', effort: 'Moderate effort' },
    { category: 'Intermediate', pace: '5:00-6:00', effort: 'Challenging pace' },
    { category: 'Advanced', pace: '4:00-5:00', effort: 'Race effort' },
    { category: 'Elite', pace: '3:00-4:00', effort: 'Maximum effort' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Pace Calculator</CardTitle>
            <CardDescription>
              Calculate your running pace, speed, and equivalent times for different distances
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                {/* Units and Activity Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="units"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Measurement Units
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select units" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="metric">Metric (km)</SelectItem>
                            <SelectItem value="imperial">Imperial (miles)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="activityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Footprints className="h-4 w-4" />
                          Activity Type
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select activity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="running">Running</SelectItem>
                            <SelectItem value="walking">Walking</SelectItem>
                            <SelectItem value="cycling">Cycling</SelectItem>
                            <SelectItem value="swimming">Swimming</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Distance Input */}
                <FormField
                  control={form.control}
                  name="distance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Distance ({units === 'metric' ? 'kilometers' : 'miles'})
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder={units === 'metric' ? 'e.g., 5' : 'e.g., 3.1'} 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Common Distances */}
                <div className="pt-2">
                  <CardDescription className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4" />
                    Common Distances
                  </CardDescription>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {commonDistances.map((distance, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="flex flex-col items-center p-2 cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => form.setValue('distance', distance.value)}
                      >
                        <span className="font-semibold">{distance.label}</span>
                        <span className="text-muted-foreground">{distance.value}{units === 'metric' ? 'km' : 'mi'}</span>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Time Input */}
                <div>
                  <FormLabel className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time
                  </FormLabel>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <FormField
                      control={form.control}
                      name="hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Hours</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Minutes</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="25" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="seconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Seconds</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate Pace
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* Equivalent Times */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Equivalent Times</CardTitle>
              <CardDescription>
                Your pace projected to common race distances
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.equivalentTimes.map((equivalent, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">{equivalent.distance}</p>
                        <p className="text-sm text-blue-600">At your current pace</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-800">{equivalent.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Educational Content */}
        <div className="mt-8">
          <Tabs defaultValue="calculation" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="calculation">Calculation</TabsTrigger>
              <TabsTrigger value="standards">Pace Standards</TabsTrigger>
              <TabsTrigger value="training">Training Tips</TabsTrigger>
            </TabsList>

            <TabsContent value="calculation">
              <Accordion type="single" collapsible>
                <AccordionItem value="formula">
                  <AccordionTrigger>How is pace calculated?</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <p>
                        Pace is calculated by dividing your total time by the distance covered. This gives you the time it takes to cover one unit of distance (per kilometer or mile).
                      </p>
                      
                      <div className="bg-muted p-4 rounded-md text-center">
                        <p className="font-mono text-sm">
                          Pace = Total Time ÷ Distance
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">Example Calculation:</h4>
                          <p className="text-muted-foreground">
                            5 km in 25 minutes<br />
                            25 ÷ 5 = 5 minutes per km
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Speed vs Pace:</h4>
                          <p className="text-muted-foreground">
                            Pace: Time per distance (min/km)<br />
                            Speed: Distance per time (km/h)
                          </p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            <TabsContent value="standards">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Running Pace Standards</h4>
                    <div className="space-y-3">
                      {paceStandards.map((standard, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <div className="font-medium">{standard.category}</div>
                            <Badge variant="secondary">{standard.pace} min/km</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{standard.effort}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="training">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Pace Training Tips</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-3">
                        <div className="font-medium text-green-600">Improving Pace</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Include interval training weekly</li>
                          <li>Build endurance with long runs</li>
                          <li>Incorporate hill repeats</li>
                          <li>Focus on running form</li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        <div className="font-medium text-blue-600">Race Strategy</div>
                        <ul className="text-muted-foreground list-disc list-inside space-y-1">
                          <li>Start slightly slower than goal pace</li>
                          <li>Practice negative splits</li>
                          <li>Use pace groups in races</li>
                          <li>Account for elevation changes</li>
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
            <CardTitle>Pace Analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Your Pace</p>
                  <div className="grid grid-cols-2 gap-4 my-3">
                    <div>
                      <p className="text-2xl font-bold text-primary">{result.paceMinPerKm}</p>
                      <p className="text-xs text-muted-foreground">min/km</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{result.paceMinPerMile}</p>
                      <p className="text-xs text-muted-foreground">min/mi</p>
                    </div>
                  </div>
                  <Badge className={`${getPaceCategory(parseFloat(result.paceMinPerKm.replace(':', '.'))).color} text-white`}>
                    {result.paceCategory}
                  </Badge>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Speed</p>
                  <div className="grid grid-cols-2 gap-4 my-3">
                    <div>
                      <p className="text-xl font-bold text-green-600">{result.speedKmh.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">km/h</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">{result.speedMph.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">mph</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Time</span>
                    <span className="font-semibold">{result.totalTime}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Distance</span>
                    <span className="font-semibold">
                      {form.getValues('distance')} {units === 'metric' ? 'km' : 'mi'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Activity</span>
                    <span className="font-semibold capitalize">{activityType}</span>
                  </div>
                </div>

                {/* Performance Insight */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Performance Level</p>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {getPaceCategory(parseFloat(result.paceMinPerKm.replace(':', '.'))).description}. 
                    This is a {result.paceCategory.toLowerCase()} level pace for {activityType}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Footprints className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Enter your distance and time to calculate your pace and speed.
                </p>
              </div>
            )}

            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Training Tip</CardTitle>
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