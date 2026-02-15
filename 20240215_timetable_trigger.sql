-- Create a function to update workload
CREATE OR REPLACE FUNCTION public.update_lecturer_workload()
RETURNS TRIGGER AS $$
DECLARE
    target_lecturer_id UUID;
    target_subject_id UUID;
    target_class_type TEXT;
    total_hours INTEGER;
BEGIN
    -- Determine which row we are dealing with (NEW or OLD)
    IF (TG_OP = 'DELETE') THEN
        target_lecturer_id := OLD.lecturer_id;
        target_subject_id := OLD.subject_id;
        target_class_type := OLD.class_type;
    ELSE
        target_lecturer_id := NEW.lecturer_id;
        target_subject_id := NEW.subject_id;
        target_class_type := NEW.class_type;
    END IF;

    -- If no lecturer assigned, skip
    IF target_lecturer_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate total hours for this lecturer, subject, and type from timetable
    -- Note: This is an approximation. We sum duration of all classes.
    -- We need to check duration. Timetable stores start_time and end_time.
    -- We assume standard weekly schedule.
    
    SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (end_time - start_time))/3600
    ), 0)
    INTO total_hours
    FROM public.timetable
    WHERE lecturer_id = target_lecturer_id
      AND subject_id = target_subject_id
      AND class_type = target_class_type;

    -- Update or Insert into workload table
    -- Check if record exists
    IF EXISTS (
        SELECT 1 FROM public.workload
        WHERE lecturer_id = target_lecturer_id
          AND subject_id = target_subject_id
          AND type = target_class_type
    ) THEN
        UPDATE public.workload
        SET hours = total_hours
        WHERE lecturer_id = target_lecturer_id
          AND subject_id = target_subject_id
          AND type = target_class_type;
    ELSE
        -- Only insert if hours > 0
        IF total_hours > 0 THEN
            INSERT INTO public.workload (lecturer_id, subject_id, type, hours)
            VALUES (target_lecturer_id, target_subject_id, target_class_type, total_hours);
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_timetable_change ON public.timetable;
CREATE TRIGGER on_timetable_change
AFTER INSERT OR UPDATE OR DELETE ON public.timetable
FOR EACH ROW EXECUTE FUNCTION public.update_lecturer_workload();
