import mongoose from 'mongoose';

const TroubleshootingSessionSchema = new mongoose.Schema(
  {
    scenarioId: {
      type: String,
      required: true,
      index: true,
    },
    scenarioTitle: {
      type: String,
      required: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    stepsCompleted: [
      {
        stepIndex: Number,
        stepName: String,
        question: String,
        userAnswer: String,
        actionTaken: String,
        observation: String,
        resultData: mongoose.Schema.Types.Mixed,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    testObservations: [
      {
        type: String,
      },
    ],
    diagnosticResults: {
      condition: String,
      explanation: String,
      certainty: String,
      evidence: [String],
    },
    finalSummary: {
      type: String,
      default: '',
    },
    recommendedNextSteps: [
      {
        type: String,
      },
    ],
    resolved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

TroubleshootingSessionSchema.index({ domain: 1, createdAt: -1 });

export default mongoose.model('TroubleshootingSession', TroubleshootingSessionSchema);
