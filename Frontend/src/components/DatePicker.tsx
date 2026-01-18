import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "../lib/utils";
import "./styles/DatePicker.css";
import "react-day-picker/style.css"; // Base styles

interface DatePickerProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    placeholder?: string;
    minDate?: Date;
    className?: string;
}

export function DatePicker({ date, setDate, placeholder = "Pick a date", minDate, className }: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        setOpen(false);
    };

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    className={cn(
                        "date-picker-trigger",
                        !date && "date-picker-placeholder",
                        className
                    )}
                >
                    <CalendarIcon className="mr-3 h-4 w-4 opacity-70" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content className="date-picker-content" align="start" sideOffset={5}>
                    <DayPicker
                        mode="single"
                        selected={date}
                        onSelect={handleSelect}
                        disabled={minDate ? { before: minDate } : undefined}
                        showOutsideDays
                        className="p-0"
                    />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
}
