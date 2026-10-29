import mongoose from 'mongoose';

const DiagnosticReportSchema = new mongoose.Schema(
  {
    lookupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DNSLookup',
      default: null,
    },
    comparisonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResolverComparison',
      default: null,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    recordType: {
      type: String,
      default: 'A',
    },
    resolver: {
      type: String,
      default: 'system',
    },
    observedCondition: {
      type: String,
      required: true,
    },
    supportingEvidence: [
      {
        type: String,
      },
    ],
    possibleExplanation: {
      type: String,
      required: true,
    },
    certaintyLevel: {
      type: String,
      enum: ['CONFIRMED', 'HIGH_PROBABILITY', 'POSSIBLE', 'INCONCLUSIVE'],
      default: 'CONFIRMED',
    },
    recommendedActions: [
      {
        type: String,
      },
    ],
    diagnosticTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    technicalDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

DiagnosticReportSchema.index({ domain: 1, diagnosticTimestamp: -1 });

export default mongoose.model('DiagnosticReport', DiagnosticReportSchema);
