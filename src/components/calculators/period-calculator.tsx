"use client";

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDays, subDays, format } from 'date-fns';
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
import { Calendar as CalendarIcon, Calculator, Lightbulb } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const formSchema = z.object({
  lastPeriodDate: z.date({
    required_error: 'Last period date is required.',
  }),
  cycleLength: z.coerce
    .number()
    .min(20, 'Cycle length must be at least 20 days.')
    .max(45, 'Cycle length cannot be more than 45 days.'),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  nextPeriod: string;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  ovulationDate: string;
}

export default function PeriodCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cycleLength: 28,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { lastPeriodDate, cycleLength } = data;
    const nextPeriodDate = addDays(lastPeriodDate, cycleLength);
    const ovulationDate = subDays(nextPeriodDate, 14);
    const fertileWindowStart = subDays(ovulationDate, 5);
    const fertileWindowEnd = addDays(ovulationDate, 1);

    setResult({
      nextPeriod: format(nextPeriodDate, 'PPP'),
      fertileWindowStart: format(fertileWindowStart, 'PPP'),
      fertileWindowEnd: format(fertileWindowEnd, 'PPP'),
      ovulationDate: format(ovulationDate, 'PPP'),
    });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const result = await suggestNextStep({ calculatorName: 'Period Calculator' });
      setSuggestion(result.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Tracking your cycle can provide valuable insights into your overall health. Consider noting symptoms to discuss with your doctor.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({ cycleLength: 28 });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="lastPeriodDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>First Day of Last Period</FormLabel>
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="cycleLength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Average Cycle Length (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g., 28"
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
                  <Calculator className="mr-2 h-4 w-4" /> Calculate
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="formula">
            <AccordionTrigger>How is the cycle estimated?</AccordionTrigger>
            <AccordionContent>
              <p className="mb-4">
                The estimates are based on the calendar method, assuming that ovulation occurs about 14 days before the start of the next period.
              </p>
              <div className="space-y-2 text-sm">
                <p><b>Next Period:</b> Last Period Date + Cycle Length</p>
                <p><b>Ovulation Day:</b> Next Period Date - 14 Days</p>
                <p><b>Fertile Window:</b> From 5 days before ovulation to 1 day after.</p>
              </div>
               <p className="mt-4 text-sm text-muted-foreground">
                This method is an estimate and can be inaccurate if your cycles are irregular.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Your Cycle Estimate</CardTitle>
            <CardDescription>Based on your provided info.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {result ? (
              <>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next Estimated Period</p>
                  <p className="text-lg font-semibold text-primary">{result.nextPeriod}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estimated Ovulation Day</p>
                  <p className="text-lg font-semibold">{result.ovulationDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estimated Fertile Window</p>
                  <p className="text-lg font-semibold">
                    {result.fertileWindowStart} - {result.fertileWindowEnd}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center">
                Enter your cycle details to see estimates.
              </p>
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
    </div>
  );
}
