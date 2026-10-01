# GhostQA finding evidence

Finding: `4efaad50-c027-45a3-8d82-acafba64d7f1` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `39116805-1425-4221-9059-cee772af6bed`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
Approval provenance: DEVELOPER; source `an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial`; eligible as of run acceptance: true.

Original journey length: 3. Best verified journey length: 3.
This is the shortest verified sequence found.
It is locally irreducible under attempted deletion strategy.
Local minimization stop reason: LOCAL MINIMUM.
Truncated: no.

## Expected invariant

When the applicability conditions hold, every approved assertion must be satisfied:

- `{"kind":"json","pointer":"/state","stepId":"later"}` not-equals `{"kind":"literal","value":"FULFILLED"}`

## Evidence references

- EXPLORATION: evidence `193b393b-606b-4813-a8da-ed3cf805daa6`, trial `2a873303-5c70-45d6-b826-df77581f9134`, baseline `3ee90cd9-6f65-48dc-b686-d4c5ad20dde1`, verdict VIOLATED.
- REPLAY: evidence `dcd7830f-d115-4617-9a00-144ded195c29`, trial `cb98b585-3c73-433a-9e69-a9069f1cfdb4`, baseline `d9cb942a-4b14-40b8-a4ba-e453ae2541ea`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `6ea77293-405a-4550-8a58-cad727053cee`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `3502d121-2824-44d9-a8a0-b6898447a0c7`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `cf57a3e6-77ec-4d4c-8b7d-9948fe2dbf93`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T21:08:03.331Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "cancelled",
        "producer": "create",
        "variable": "orderId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "orderId"
      }
    ],
    "id": "80228efc-e499-49a4-b2cd-f00b949f79fd",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "39116805-1425-4221-9059-cee772af6bed",
      "version": 1
    },
    "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled within the same trial, confirming state transition constraints.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "orderId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/orders",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200
        ],
        "extracts": [],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          409
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/orders/{orderId}/fulfill",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "bestLength": 3,
  "executionProvenance": {
    "acceptedAt": "2026-10-01T21:08:03.331Z",
    "deadlineAt": "2026-10-01T21:18:03.331Z",
    "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
    "trialIds": [
      "2a873303-5c70-45d6-b826-df77581f9134",
      "cb98b585-3c73-433a-9e69-a9069f1cfdb4"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "4efaad50-c027-45a3-8d82-acafba64d7f1",
    "initialEvidenceId": "193b393b-606b-4813-a8da-ed3cf805daa6",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "80228efc-e499-49a4-b2cd-f00b949f79fd",
    "originalJourneyId": "80228efc-e499-49a4-b2cd-f00b949f79fd",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "39116805-1425-4221-9059-cee772af6bed",
      "version": 1
    },
    "projectId": "25c0c57f-683c-4733-89e9-a1a9679521e6",
    "replayEvidenceIds": [
      "dcd7830f-d115-4617-9a00-144ded195c29"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "193b393b-606b-4813-a8da-ed3cf805daa6"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "193b393b-606b-4813-a8da-ed3cf805daa6",
          "dcd7830f-d115-4617-9a00-144ded195c29"
        ],
        "next": "CONFIRMED",
        "prior": "OBSERVED VIOLATION",
        "reason": "INDEPENDENT FRESH REPLAY VIOLATED"
      }
    ]
  },
  "formatVersion": 1,
  "generationState": "GENERATED",
  "initial": {
    "baseline": {
      "assertionIds": [
        "db8a5e6e-461f-4f43-93f1-a07ccd0903aa"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "3ee90cd9-6f65-48dc-b686-d4c5ad20dde1",
      "resetStepIds": [
        "reset"
      ],
      "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
      "trialId": "2a873303-5c70-45d6-b826-df77581f9134",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "3ee90cd9-6f65-48dc-b686-d4c5ad20dde1",
      "id": "193b393b-606b-4813-a8da-ed3cf805daa6",
      "observationIds": [
        "0f23b6be-073b-4930-9fcd-edad02ef6abb",
        "2c1d9ad4-123b-4e26-a705-01eddc3350ea",
        "ff95f685-0014-4847-855a-bc3b8c750088"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "39116805-1425-4221-9059-cee772af6bed",
        "version": 1
      },
      "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
      "symbolicOperands": {
        "applicability": [
          {
            "left": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "cancelled"
            },
            "op": "equals",
            "right": {
              "kind": "literal",
              "value": "CANCELLED"
            }
          },
          {
            "left": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "cancelled"
            },
            "op": "equals",
            "right": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "later"
            }
          },
          {
            "left": {
              "kind": "step-index",
              "stepId": "cancelled"
            },
            "op": "before",
            "right": {
              "kind": "step-index",
              "stepId": "later"
            }
          }
        ],
        "assertions": [
          {
            "left": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "later"
            },
            "op": "not-equals",
            "right": {
              "kind": "literal",
              "value": "FULFILLED"
            }
          }
        ],
        "executionOrder": [
          {
            "operationId": "POST /api/orders",
            "ordinal": 0,
            "stepId": "create"
          },
          {
            "operationId": "POST /api/orders/{orderId}/cancel",
            "ordinal": 1,
            "stepId": "cancelled"
          },
          {
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "ordinal": 2,
            "stepId": "later"
          }
        ]
      },
      "trialId": "2a873303-5c70-45d6-b826-df77581f9134"
    },
    "observations": [
      {
        "id": "2c1d9ad4-123b-4e26-a705-01eddc3350ea",
        "result": {
          "elapsedMs": 0.9255840000005264,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:57774/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d3550999-6135-4dde-b0d3-c5a62674a665",
              "state": "CREATED"
            },
            "elapsedMs": 0.9255840000005264,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:06 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"d3550999-6135-4dde-b0d3-c5a62674a665\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:06.582Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "2a873303-5c70-45d6-b826-df77581f9134"
      },
      {
        "id": "0f23b6be-073b-4930-9fcd-edad02ef6abb",
        "result": {
          "elapsedMs": 1.7626249999993888,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:57774/api/orders/d3550999-6135-4dde-b0d3-c5a62674a665/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d3550999-6135-4dde-b0d3-c5a62674a665",
              "state": "CANCELLED"
            },
            "elapsedMs": 1.7626249999993888,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:06 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"d3550999-6135-4dde-b0d3-c5a62674a665\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:06.586Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "2a873303-5c70-45d6-b826-df77581f9134"
      },
      {
        "id": "ff95f685-0014-4847-855a-bc3b8c750088",
        "result": {
          "elapsedMs": 1.9174169999969308,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:57774/api/orders/d3550999-6135-4dde-b0d3-c5a62674a665/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d3550999-6135-4dde-b0d3-c5a62674a665",
              "state": "FULFILLED"
            },
            "elapsedMs": 1.9174169999969308,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:06 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"d3550999-6135-4dde-b0d3-c5a62674a665\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:06.593Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "2a873303-5c70-45d6-b826-df77581f9134"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "6ea77293-405a-4550-8a58-cad727053cee",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "39116805-1425-4221-9059-cee772af6bed",
            "version": 1
          },
          "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled within the same trial, confirming state transition constraints.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200
              ],
              "extracts": [],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
                  }
                }
              ]
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                409
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PRODUCER REQUIRED",
        "removedStepId": "create"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "later",
              "producer": "create",
              "variable": "orderId"
            }
          ],
          "id": "3502d121-2824-44d9-a8a0-b6898447a0c7",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "39116805-1425-4221-9059-cee772af6bed",
            "version": 1
          },
          "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled within the same trial, confirming state transition constraints.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "orderId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/orders",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                409
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PREDICATE STEP REQUIRED",
        "removedStepId": "cancelled"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "cancelled",
              "producer": "create",
              "variable": "orderId"
            }
          ],
          "id": "cf57a3e6-77ec-4d4c-8b7d-9948fe2dbf93",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "39116805-1425-4221-9059-cee772af6bed",
            "version": 1
          },
          "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled within the same trial, confirming state transition constraints.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "orderId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/orders",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200
              ],
              "extracts": [],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PREDICATE STEP REQUIRED",
        "removedStepId": "later"
      }
    ],
    "best": {
      "dependencies": [
        {
          "consumer": "cancelled",
          "producer": "create",
          "variable": "orderId"
        },
        {
          "consumer": "later",
          "producer": "create",
          "variable": "orderId"
        }
      ],
      "id": "80228efc-e499-49a4-b2cd-f00b949f79fd",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "39116805-1425-4221-9059-cee772af6bed",
        "version": 1
      },
      "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled within the same trial, confirming state transition constraints.",
      "steps": [
        {
          "bodyBindings": [],
          "expectedStatuses": [
            201
          ],
          "extracts": [
            {
              "expectedType": "string",
              "name": "orderId",
              "sensitive": false,
              "source": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ],
          "id": "create",
          "operationId": "POST /api/orders",
          "parameters": []
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200
          ],
          "extracts": [],
          "id": "cancelled",
          "operationId": "POST /api/orders/{orderId}/cancel",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
              "value": {
                "kind": "variable",
                "name": "orderId"
              }
            }
          ]
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            409
          ],
          "extracts": [],
          "id": "later",
          "operationId": "POST /api/orders/{orderId}/fulfill",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
              "value": {
                "kind": "variable",
                "name": "orderId"
              }
            }
          ]
        }
      ],
      "variables": []
    },
    "bestLength": 3,
    "finding": {
      "classification": "CONFIRMED",
      "consistent": true,
      "id": "4efaad50-c027-45a3-8d82-acafba64d7f1",
      "initialEvidenceId": "193b393b-606b-4813-a8da-ed3cf805daa6",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "80228efc-e499-49a4-b2cd-f00b949f79fd",
      "originalJourneyId": "80228efc-e499-49a4-b2cd-f00b949f79fd",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "39116805-1425-4221-9059-cee772af6bed",
        "version": 1
      },
      "projectId": "25c0c57f-683c-4733-89e9-a1a9679521e6",
      "replayEvidenceIds": [
        "dcd7830f-d115-4617-9a00-144ded195c29"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "193b393b-606b-4813-a8da-ed3cf805daa6"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "193b393b-606b-4813-a8da-ed3cf805daa6",
            "dcd7830f-d115-4617-9a00-144ded195c29"
          ],
          "next": "CONFIRMED",
          "prior": "OBSERVED VIOLATION",
          "reason": "INDEPENDENT FRESH REPLAY VIOLATED"
        }
      ]
    },
    "locallyIrreducible": true,
    "originalLength": 3,
    "stopReason": "LOCAL MINIMUM"
  },
  "originalJourney": {
    "dependencies": [
      {
        "consumer": "cancelled",
        "producer": "create",
        "variable": "orderId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "orderId"
      }
    ],
    "id": "80228efc-e499-49a4-b2cd-f00b949f79fd",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "39116805-1425-4221-9059-cee772af6bed",
      "version": 1
    },
    "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled within the same trial, confirming state transition constraints.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "orderId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/orders",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200
        ],
        "extracts": [],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          409
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/orders/{orderId}/fulfill",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "originalLength": 3,
  "predicate": {
    "applicability": [
      {
        "left": {
          "kind": "json",
          "pointer": "/state",
          "stepId": "cancelled"
        },
        "op": "equals",
        "right": {
          "kind": "literal",
          "value": "CANCELLED"
        }
      },
      {
        "left": {
          "kind": "json",
          "pointer": "/id",
          "stepId": "cancelled"
        },
        "op": "equals",
        "right": {
          "kind": "json",
          "pointer": "/id",
          "stepId": "later"
        }
      },
      {
        "left": {
          "kind": "step-index",
          "stepId": "cancelled"
        },
        "op": "before",
        "right": {
          "kind": "step-index",
          "stepId": "later"
        }
      }
    ],
    "assertions": [
      {
        "left": {
          "kind": "json",
          "pointer": "/state",
          "stepId": "later"
        },
        "op": "not-equals",
        "right": {
          "kind": "literal",
          "value": "FULFILLED"
        }
      }
    ],
    "canonicalHash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "39116805-1425-4221-9059-cee772af6bed",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "39116805-1425-4221-9059-cee772af6bed",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "db8a5e6e-461f-4f43-93f1-a07ccd0903aa"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "d9cb942a-4b14-40b8-a4ba-e453ae2541ea",
        "resetStepIds": [
          "reset"
        ],
        "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
        "trialId": "cb98b585-3c73-433a-9e69-a9069f1cfdb4",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "d9cb942a-4b14-40b8-a4ba-e453ae2541ea",
        "id": "dcd7830f-d115-4617-9a00-144ded195c29",
        "observationIds": [
          "80c8ca90-c95a-4e32-a122-b5fefa4d51a6",
          "b3c5dfcb-ddc9-4824-9ecc-5fe0f4a2623f",
          "6890e9e2-1f75-404d-8ac3-cf8970f0eb71"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "39116805-1425-4221-9059-cee772af6bed",
          "version": 1
        },
        "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
        "symbolicOperands": {
          "applicability": [
            {
              "left": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "cancelled"
              },
              "op": "equals",
              "right": {
                "kind": "literal",
                "value": "CANCELLED"
              }
            },
            {
              "left": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "cancelled"
              },
              "op": "equals",
              "right": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "later"
              }
            },
            {
              "left": {
                "kind": "step-index",
                "stepId": "cancelled"
              },
              "op": "before",
              "right": {
                "kind": "step-index",
                "stepId": "later"
              }
            }
          ],
          "assertions": [
            {
              "left": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "later"
              },
              "op": "not-equals",
              "right": {
                "kind": "literal",
                "value": "FULFILLED"
              }
            }
          ],
          "executionOrder": [
            {
              "operationId": "POST /api/orders",
              "ordinal": 0,
              "stepId": "create"
            },
            {
              "operationId": "POST /api/orders/{orderId}/cancel",
              "ordinal": 1,
              "stepId": "cancelled"
            },
            {
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "ordinal": 2,
              "stepId": "later"
            }
          ]
        },
        "trialId": "cb98b585-3c73-433a-9e69-a9069f1cfdb4"
      },
      "observations": [
        {
          "id": "b3c5dfcb-ddc9-4824-9ecc-5fe0f4a2623f",
          "result": {
            "elapsedMs": 1.7203750000007858,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:57774/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "27219ee3-ca8c-420a-b718-37db5575e620",
                "state": "CREATED"
              },
              "elapsedMs": 1.7203750000007858,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:06 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"27219ee3-ca8c-420a-b718-37db5575e620\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:06.638Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "cb98b585-3c73-433a-9e69-a9069f1cfdb4"
        },
        {
          "id": "80c8ca90-c95a-4e32-a122-b5fefa4d51a6",
          "result": {
            "elapsedMs": 1.5341670000016165,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:57774/api/orders/27219ee3-ca8c-420a-b718-37db5575e620/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "27219ee3-ca8c-420a-b718-37db5575e620",
                "state": "CANCELLED"
              },
              "elapsedMs": 1.5341670000016165,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:06 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"27219ee3-ca8c-420a-b718-37db5575e620\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:06.643Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "cb98b585-3c73-433a-9e69-a9069f1cfdb4"
        },
        {
          "id": "6890e9e2-1f75-404d-8ac3-cf8970f0eb71",
          "result": {
            "elapsedMs": 1.4898749999993015,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:57774/api/orders/27219ee3-ca8c-420a-b718-37db5575e620/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "27219ee3-ca8c-420a-b718-37db5575e620",
                "state": "FULFILLED"
              },
              "elapsedMs": 1.4898749999993015,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:06 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"27219ee3-ca8c-420a-b718-37db5575e620\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:06.648Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "cb98b585-3c73-433a-9e69-a9069f1cfdb4"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "2349e93b-a4b6-4ea0-bfc0-a5021b29be3d",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
