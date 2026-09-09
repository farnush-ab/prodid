import { Schema, model, models, type Model } from "mongoose";

interface CounterDoc {
  key: string;
  seq: number;
}

const CounterSchema = new Schema<CounterDoc>({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter: Model<CounterDoc> =
  (models.Counter as Model<CounterDoc>) || model<CounterDoc>("Counter", CounterSchema);
