import mongoose from 'mongoose';

const ResolverComparisonSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    recordType: {
      type: String,
      required: true,
      enum: ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'ALL'],
      index: true,
    },
    selectedResolvers: [
      {
        type: String,
        required: true,
      },
    ],
    results: [
      {
        resolver: { type: String, required: true },
        resolverName: { type: String, default: '' },
        durationMs: { type: Number, required: true },
        status: { type: String, required: true },
        recordCount: { type: Number, default: 0 },
        records: mongoose.Schema.Types.Mixed,
        errorCode: String,
        errorMessage: String,
      },
    ],
    measuredDurations: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    fastestResolver: {
      type: String,
      default: null,
    },
    fastestDurationMs: {
      type: Number,
      default: null,
    },
    comparisonTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    summaryOfDifferences: {
      type: String,
      default: '',
    },
    recordsMatch: {
      type: Boolean,
      default: true,
    },
    evidenceNotes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ResolverComparisonSchema.index({ domain: 1, comparisonTimestamp: -1 });

export default mongoose.model('ResolverComparison', ResolverComparisonSchema);
