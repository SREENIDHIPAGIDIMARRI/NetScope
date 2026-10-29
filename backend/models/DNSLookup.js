import mongoose from 'mongoose';

const DNSLookupSchema = new mongoose.Schema(
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
    resolver: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resolverName: {
      type: String,
      default: 'System Resolver',
    },
    queryTimestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    responseDurationMs: {
      type: Number,
      required: true,
      min: 0,
    },
    returnedRecords: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    recordCount: {
      type: Number,
      default: 0,
    },
    queryStatus: {
      type: String,
      required: true,
      enum: ['SUCCESS', 'PARTIAL', 'NO_RECORDS', 'NXDOMAIN', 'TIMEOUT', 'SERVFAIL', 'REFUSED', 'ERROR'],
      index: true,
    },
    errorCode: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    metadata: {
      subQueries: [
        {
          type: { type: String },
          durationMs: Number,
          status: String,
          records: mongoose.Schema.Types.Mixed,
          error: String,
        },
      ],
      clientIp: String,
      authoritativeSource: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast searching and statistics aggregation
DNSLookupSchema.index({ domain: 1, queryTimestamp: -1 });
DNSLookupSchema.index({ queryStatus: 1, queryTimestamp: -1 });
DNSLookupSchema.index({ resolver: 1, queryTimestamp: -1 });

export default mongoose.model('DNSLookup', DNSLookupSchema);
