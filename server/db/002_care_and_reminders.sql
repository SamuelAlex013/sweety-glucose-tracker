ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor'));
ALTER TABLE users ADD COLUMN report_version bigint NOT NULL DEFAULT 0;

CREATE TABLE doctor_patients (
  doctor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (doctor_id, patient_id),
  CHECK (doctor_id <> patient_id)
);

CREATE TABLE reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  reading_count smallint NOT NULL CHECK (reading_count BETWEEN 0 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
