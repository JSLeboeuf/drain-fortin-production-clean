-- Normalize call duration: migrate data from duration -> call_duration and drop legacy column
DO $$
BEGIN
  -- Copy legacy duration into call_duration if call_duration is NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vapi_calls' AND column_name = 'duration'
  ) THEN
    UPDATE vapi_calls
    SET call_duration = COALESCE(call_duration, duration)
    WHERE duration IS NOT NULL;
  END IF;

  -- Drop legacy column if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vapi_calls' AND column_name = 'duration'
  ) THEN
    ALTER TABLE vapi_calls DROP COLUMN duration;
  END IF;
END;
$$;

