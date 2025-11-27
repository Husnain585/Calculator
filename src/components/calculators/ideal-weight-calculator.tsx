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
import { Calculator as CalculatorIcon, Lightbulb } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const formSchema = z.object({
  height: z.coerce.number().positive('Height must be positive'),
  gender: z.enum(['male', 'female']),
});

type FormValues = z.infer<typeof formSchema>;

interface Result {
  robinson: number;
  devine: number;
}

export default function IdealWeightCalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: 'male',
      height: undefined,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { height, gender } = data;
    const heightInInches = height / 2.54;
    const inchesOver5Feet = heightInInches > 60 ? heightInInches - 60 : 0;
    
    let robinson, devine;

    if (gender === 'male') {
      robinson = 52 + 1.9 * inchesOver5Feet;
      devine = 50 + 2.3 * inchesOver5Feet;
    } else {
      robinson = 49 + 1.7 * inchesOver5Feet;
      devine = 45.5 + 2.3 * inchesOver5Feet;
    }

    setResult({ robinson, devine });

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ calculatorName: 'Ideal Weight Calculator' });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("This is an estimate. Check your BMI or body fat percentage for a more complete picture of your health.");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({ gender: 'male', height: undefined });
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
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 175" {...field} />
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
                        <FormLabel>Biological Sex</FormLabel>
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
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button type="submit">
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="formula">
            <AccordionTrigger>How is ideal weight calculated?</AccordionTrigger>
            <AccordionContent>
              <p className="mb-4">
                This calculator uses several common formulas to estimate an ideal weight range. The most common formulas are based on height and gender.
              </p>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold">Robinson Formula (1983)</h4>
                  <p>Male: 52 kg + 1.9 kg per inch over 5 feet</p>
                  <p>Female: 49 kg + 1.7 kg per inch over 5 feet</p>
                </div>
                <div>
                  <h4 className="font-semibold">Devine Formula (1974)</h4>
                  <p>Male: 50 kg + 2.3 kg per inch over 5 feet</p>
                  <p>Female: 45.5 kg + 2.3 kg per inch over 5 feet</p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                These formulas provide an estimated healthy weight range but do not account for individual differences in body composition, such as muscle mass.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Ideal Weight Range</CardTitle>
            <CardDescription>Based on common formulas (Robinson, Devine).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6 text-center">
            {result ? (
              <div>
                <p className="text-4xl font-bold text-primary my-2">
                  {Math.min(result.robinson, result.devine).toFixed(1)} - {Math.max(result.robinson, result.devine).toFixed(1)} kg
                </p>
                <p className="text-muted-foreground">({(Math.min(result.robinson, result.devine) * 2.20462).toFixed(1)} - {(Math.max(result.robinson, result.devine) * 2.20462).toFixed(1)} lbs)</p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Enter your details to see your estimated ideal weight range.
              </p>
            )}

            {(suggestion || suggestionLoading) && (
                 <div className="pt-6 border-t">
                  <CardHeader className="p-0 mb-2 flex-row items-center gap-2 justify-center">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Pro Tip</CardTitle>
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
