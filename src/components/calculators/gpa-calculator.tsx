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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Calculator as CalculatorIcon, BookOpen, GraduationCap, Plus, Trash2, Copy, History, Info, Sparkles, Target } from 'lucide-react';
import { suggestNextStep } from '@/ai/flows/suggest-next-step';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';

const courseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  credits: z.coerce.number().min(0.5).max(10, 'Credits must be between 0.5 and 10'),
  grade: z.string().min(1, 'Grade is required'),
});

const formSchema = z.object({
  courses: z.array(courseSchema).min(1, 'At least one course is required'),
  currentGPA: z.coerce.number().min(0).max(4.0).optional(),
  currentCredits: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;
type Course = z.infer<typeof courseSchema>;

interface Result {
  semesterGPA: number;
  cumulativeGPA: number;
  totalCredits: number;
  timestamp: Date;
}

const GRADE_POINTS: { [key: string]: number } = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0.0
};

const GRADE_OPTIONS = [
  { value: 'A+', label: 'A+ (4.0)', emoji: '🎯' },
  { value: 'A', label: 'A (4.0)', emoji: '⭐' },
  { value: 'A-', label: 'A- (3.7)', emoji: '👍' },
  { value: 'B+', label: 'B+ (3.3)', emoji: '💪' },
  { value: 'B', label: 'B (3.0)', emoji: '✅' },
  { value: 'B-', label: 'B- (2.7)', emoji: '📚' },
  { value: 'C+', label: 'C+ (2.3)', emoji: '📖' },
  { value: 'C', label: 'C (2.0)', emoji: '🔍' },
  { value: 'C-', label: 'C- (1.7)', emoji: '⚠️' },
  { value: 'D+', label: 'D+ (1.3)', emoji: '📉' },
  { value: 'D', label: 'D (1.0)', emoji: '🔻' },
  { value: 'D-', label: 'D- (0.7)', emoji: '❌' },
  { value: 'F', label: 'F (0.0)', emoji: '💥' },
];

export default function GPACalculator() {
  const [result, setResult] = useState<Result | null>(null);
  const [suggestion, setSuggestion] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [history, setHistory] = useState<Result[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courses: [{ name: '', credits: 3, grade: '' }],
      currentGPA: undefined,
      currentCredits: undefined,
    },
  });

  const courses = form.watch('courses');
  const currentGPA = form.watch('currentGPA');
  const currentCredits = form.watch('currentCredits');

  const addCourse = () => {
    const currentCourses = form.getValues('courses');
    form.setValue('courses', [...currentCourses, { name: '', credits: 3, grade: '' }]);
  };

  const removeCourse = (index: number) => {
    const currentCourses = form.getValues('courses');
    if (currentCourses.length > 1) {
      form.setValue('courses', currentCourses.filter((_, i) => i !== index));
    }
  };

  const calculateGPA = (courses: Course[], currentGPA?: number, currentCredits?: number) => {
    let totalPoints = 0;
    let totalCredits = 0;

    // Calculate semester GPA
    courses.forEach(course => {
      const points = GRADE_POINTS[course.grade] || 0;
      totalPoints += points * course.credits;
      totalCredits += course.credits;
    });

    const semesterGPA = totalCredits > 0 ? totalPoints / totalCredits : 0;

    // Calculate cumulative GPA if previous data provided
    let cumulativeGPA = semesterGPA;
    if (currentGPA && currentCredits && currentCredits > 0) {
      const previousPoints = currentGPA * currentCredits;
      cumulativeGPA = (previousPoints + totalPoints) / (currentCredits + totalCredits);
    }

    return {
      semesterGPA,
      cumulativeGPA,
      totalCredits,
    };
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const { courses, currentGPA, currentCredits } = data;
    
    const calculation = calculateGPA(courses, currentGPA, currentCredits);
    const newResult = { ...calculation, timestamp: new Date() };
    
    setResult(newResult);
    setHistory(prev => [newResult, ...prev.slice(0, 9)]);

    setSuggestionLoading(true);
    setSuggestion('');
    try {
      const res = await suggestNextStep({ 
        calculatorName: 'GPA Calculator',
        semesterGPA: calculation.semesterGPA,
        cumulativeGPA: calculation.cumulativeGPA,
        totalCredits: calculation.totalCredits,
        courseCount: courses.length
      });
      setSuggestion(res.suggestion);
    } catch (error) {
      console.error('Failed to get AI suggestion:', error);
      setSuggestion("Maintaining a strong GPA is important for academic success. Consider meeting with academic advisors for personalized guidance!");
    } finally {
      setSuggestionLoading(false);
    }
  };

  const resetCalculator = () => {
    form.reset({
      courses: [{ name: '', credits: 3, grade: '' }],
      currentGPA: undefined,
      currentCredits: undefined,
    });
    setResult(null);
    setSuggestion('');
    setSuggestionLoading(false);
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `Semester GPA: ${result.semesterGPA.toFixed(2)} | Cumulative GPA: ${result.cumulativeGPA.toFixed(2)} | Total Credits: ${result.totalCredits}`;
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'GPA calculation copied to clipboard.',
      duration: 2000,
    });
  };

  const getCommonCreditOptions = () => [
    { credits: 1, label: '1 Credit' },
    { credits: 2, label: '2 Credits' },
    { credits: 3, label: '3 Credits' },
    { credits: 4, label: '4 Credits' },
    { credits: 5, label: '5 Credits' },
  ];

  const applyCommonCredits = (credits: number, index: number) => {
    const currentCourses = [...courses];
    currentCourses[index].credits = credits;
    form.setValue('courses', currentCourses);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>GPA Calculator</CardTitle>
            <CardDescription>
              Calculate your semester and cumulative GPA with multiple courses
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                {/* Current GPA Information */}
                <div className="space-y-4">
                  <FormLabel className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    Current Academic Standing (Optional)
                  </FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currentGPA"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Cumulative GPA</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" max="4.0" placeholder="e.g., 3.45" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currentCredits"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Completed Credits</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" min="0" placeholder="e.g., 45" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Courses */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      Courses
                    </FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={addCourse}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course
                    </Button>
                  </div>

                  {courses.map((course, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Course {index + 1}</h4>
                        {courses.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCourse(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Course Name */}
                        <FormField
                          control={form.control}
                          name={`courses.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Course Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Calculus I" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Credits */}
                        <FormField
                          control={form.control}
                          name={`courses.${index}.credits`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Credits</FormLabel>
                              <div className="space-y-2">
                                <FormControl>
                                  <Input type="number" step="0.5" min="0.5" max="10" {...field} />
                                </FormControl>
                                <div className="grid grid-cols-5 gap-1">
                                  {getCommonCreditOptions().map((option, optionIndex) => (
                                    <Button
                                      key={optionIndex}
                                      type="button"
                                      variant={course.credits === option.credits ? "default" : "outline"}
                                      size="sm"
                                      className="h-6 text-xs"
                                      onClick={() => applyCommonCredits(option.credits, index)}
                                    >
                                      {option.credits}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Grade */}
                        <FormField
                          control={form.control}
                          name={`courses.${index}.grade`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Grade</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select grade" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {GRADE_OPTIONS.map((grade) => (
                                    <SelectItem key={grade.value} value={grade.value}>
                                      <div className="flex items-center gap-2">
                                        <span>{grade.emoji}</span>
                                        <span>{grade.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Calculation Preview */}
                {courses.some(course => course.grade && course.credits > 0) && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Semester GPA (Estimate):</span>
                      <span className="font-semibold">
                        {calculateGPA(courses.filter(c => c.grade && c.credits > 0)).semesterGPA.toFixed(2)}
                      </span>
                    </div>
                    {currentGPA && currentCredits && (
                      <div className="flex justify-between text-sm">
                        <span>Cumulative GPA (Estimate):</span>
                        <span className="font-semibold">
                          {calculateGPA(
                            courses.filter(c => c.grade && c.credits > 0), 
                            currentGPA, 
                            currentCredits
                          ).cumulativeGPA.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-4">
                <Button type="button" variant="outline" onClick={resetCalculator}>
                  Reset
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={!courses.some(course => course.name && course.grade && course.credits > 0)}
                >
                  <CalculatorIcon className="mr-2 h-4 w-4" />
                  Calculate GPA
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Calculation History
              </CardTitle>
              <CardDescription>
                Recent GPA calculations (last 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">GPA: {item.semesterGPA.toFixed(2)}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.cumulativeGPA.toFixed(2)} cumulative
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString()} • {item.totalCredits} credits
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        item.semesterGPA >= 3.5 ? 'text-green-600' : 
                        item.semesterGPA >= 3.0 ? 'text-blue-600' : 
                        item.semesterGPA >= 2.0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {item.semesterGPA >= 3.5 ? 'Excellent' : 
                         item.semesterGPA >= 3.0 ? 'Good' : 
                         item.semesterGPA >= 2.0 ? 'Satisfactory' : 'Needs Improvement'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Results Panel */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Your GPA Results</CardTitle>
          </CardHeader>
          <CardContent className="text-center p-6 space-y-6">
            {result ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Semester GPA</p>
                    <p className={`text-3xl font-bold ${
                      result.semesterGPA >= 3.5 ? 'text-green-600' : 
                      result.semesterGPA >= 3.0 ? 'text-blue-600' : 
                      result.semesterGPA >= 2.0 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {result.semesterGPA.toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 border rounded-lg">
                      <p className="text-muted-foreground">Cumulative GPA</p>
                      <p className="font-semibold">{result.cumulativeGPA.toFixed(2)}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-muted-foreground">Total Credits</p>
                      <p className="font-semibold">{result.totalCredits}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-medium">Calculation Details</p>
                  </div>
                  <div className="text-sm text-muted-foreground text-left space-y-1">
                    <p>• Courses Calculated: {courses.length}</p>
                    <p>• Quality Points: {(result.semesterGPA * result.totalCredits).toFixed(1)}</p>
                    {currentGPA && currentCredits && (
                      <>
                        <p>• Previous GPA: {currentGPA.toFixed(2)}</p>
                        <p>• Previous Credits: {currentCredits}</p>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={copyToClipboard}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Results
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Add your courses and grades to calculate your GPA.
                </p>
              </div>
            )}
             
            {(suggestion || suggestionLoading) && (
              <div className="pt-6 border-t">
                <CardHeader className="p-0 mb-2 flex-row items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Academic Insight</CardTitle>
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
        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guide">GPA Guide</TabsTrigger>
            <TabsTrigger value="grading">Grading Scale</TabsTrigger>
            <TabsTrigger value="strategies">Success Strategies</TabsTrigger>
          </TabsList>
          
          <TabsContent value="guide">
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation">
                <AccordionTrigger>How is GPA calculated?</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <p>
                      GPA (Grade Point Average) is calculated by multiplying the grade points for each course by its credit hours, summing these values, and then dividing by the total credit hours.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">GPA Calculation Formula</h4>
                        <div className="font-mono bg-muted p-4 rounded-md text-sm">
                          GPA = Σ(Grade Points × Credits) ÷ Σ(Credits)
                        </div>
                      </div>
                      
                      <div className="font-mono bg-muted p-4 rounded-md text-sm">
                        Cumulative GPA = (Previous GPA × Previous Credits + Current GPA × Current Credits) ÷ Total Credits
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">GPA Ranges</h4>
                          <div className="text-sm space-y-2">
                            <p><strong>3.7-4.0:</strong> Excellent (Dean's List)</p>
                            <p><strong>3.3-3.6:</strong> Very Good</p>
                            <p><strong>3.0-3.2:</strong> Good</p>
                            <p><strong>2.7-2.9:</strong> Satisfactory</p>
                            <p><strong>2.0-2.6:</strong> Needs Improvement</p>
                            <p><strong>Below 2.0:</strong> Academic Probation</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-2">Quick Reference</h4>
                          <div className="text-sm space-y-2">
                            <p>• Each A grade = 4.0 points</p>
                            <p>• Each B grade = 3.0 points</p>
                            <p>• Each C grade = 2.0 points</p>
                            <p>• Credits determine weight</p>
                            <p>• Higher credits = more impact</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="grading">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Grading Scale Reference</h3>
                <div className="space-y-4">
                  {GRADE_OPTIONS.map((grade, index) => (
                    <div key={index} className="flex items-center gap-4 py-3 border-b">
                      <Badge 
                        variant="outline" 
                        className={`whitespace-nowrap ${
                          GRADE_POINTS[grade.value] >= 3.7 ? 'border-green-200 bg-green-50' :
                          GRADE_POINTS[grade.value] >= 3.0 ? 'border-blue-200 bg-blue-50' :
                          GRADE_POINTS[grade.value] >= 2.0 ? 'border-yellow-200 bg-yellow-50' :
                          'border-red-200 bg-red-50'
                        }`}
                      >
                        {grade.value}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{grade.label}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {GRADE_POINTS[grade.value]} grade points per credit
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{GRADE_POINTS[grade.value].toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategies">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">Academic Success Strategies</h3>
                </div>
                <div className="space-y-4 text-sm">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">📚 Study Techniques</h4>
                    <div className="space-y-2 text-muted-foreground">
                      <p>• Use active recall and spaced repetition</p>
                      <p>• Create study schedules and stick to them</p>
                      <p>• Form study groups for difficult subjects</p>
                      <p>• Review material regularly, not just before exams</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">🎯 GPA Improvement</h4>
                    <div className="space-y-2 text-muted-foreground">
                      <p>• Focus on high-credit courses first</p>
                      <p>• Balance difficult and easier courses each semester</p>
                      <p>• Meet with professors during office hours</p>
                      <p>• Use campus resources (tutoring, writing centers)</p>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      <h4 className="font-semibold">Quick GPA Tips</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>• <strong>B in 4-credit course</strong> has same impact as <strong>A in 3-credit course</strong></p>
                      <p>• One A can raise GPA more than multiple Bs</p>
                      <p>• Consistent performance is better than occasional excellence</p>
                      <p>• Plan course loads strategically across semesters</p>
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