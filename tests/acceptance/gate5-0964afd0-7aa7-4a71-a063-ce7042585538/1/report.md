# GhostQA finding evidence

Finding: `efd5a5a1-c80b-4480-859f-a071f4c652ef` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `8142b4d0-fc2b-4f24-9ab6-b1dded824b1a`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
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

- EXPLORATION: evidence `d51935fb-b8ac-460b-905c-8d04d5875c81`, trial `5ffe0752-174f-4c0a-bf05-20037e2f1751`, baseline `9f1728f2-26c8-4883-998e-5a6eac46736e`, verdict VIOLATED.
- REPLAY: evidence `2b50647a-eb63-4dc6-9021-c22401a7a1e1`, trial `a83453a0-7bf2-430f-ad16-2c0d91c95591`, baseline `4e844a3a-8ff3-4b18-890e-8dbee214f0af`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `f5d343e4-f485-4fb8-a378-a64cb5ea6ef1`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `e9e5039c-6df8-4fa5-a60c-059eed2aae7c`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `1a34df33-bc7d-4833-a538-073bd54a4cdb`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T20:40:39.265Z",
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
    "id": "d76b693b-ef31-42a6-9db2-67e5ee04ea66",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
      "version": 1
    },
    "rationale": "Validating that an order cancelled cannot be fulfilled subsequently.",
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
          200,
          409
        ],
        "extracts": [],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
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
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "bestLength": 3,
  "executionProvenance": {
    "acceptedAt": "2026-10-01T20:40:39.265Z",
    "deadlineAt": "2026-10-01T20:50:39.265Z",
    "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
    "trialIds": [
      "5ffe0752-174f-4c0a-bf05-20037e2f1751",
      "a83453a0-7bf2-430f-ad16-2c0d91c95591"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "efd5a5a1-c80b-4480-859f-a071f4c652ef",
    "initialEvidenceId": "d51935fb-b8ac-460b-905c-8d04d5875c81",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "d76b693b-ef31-42a6-9db2-67e5ee04ea66",
    "originalJourneyId": "d76b693b-ef31-42a6-9db2-67e5ee04ea66",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
      "version": 1
    },
    "projectId": "9b0fe11e-d397-4673-ac2d-965bd6b2247a",
    "replayEvidenceIds": [
      "2b50647a-eb63-4dc6-9021-c22401a7a1e1"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "d51935fb-b8ac-460b-905c-8d04d5875c81"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "d51935fb-b8ac-460b-905c-8d04d5875c81",
          "2b50647a-eb63-4dc6-9021-c22401a7a1e1"
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
        "350b0468-1ba9-47e7-976f-7030b5b5d89c"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "9f1728f2-26c8-4883-998e-5a6eac46736e",
      "resetStepIds": [
        "reset"
      ],
      "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
      "trialId": "5ffe0752-174f-4c0a-bf05-20037e2f1751",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "9f1728f2-26c8-4883-998e-5a6eac46736e",
      "id": "d51935fb-b8ac-460b-905c-8d04d5875c81",
      "observationIds": [
        "c143b46d-013e-4da2-aad1-87cdada7daa8",
        "b9d33275-ce7b-429d-8599-d48070129cd0",
        "d9665e25-c2f4-449a-961b-d8490906ffdb"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
        "version": 1
      },
      "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
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
      "trialId": "5ffe0752-174f-4c0a-bf05-20037e2f1751"
    },
    "observations": [
      {
        "id": "d9665e25-c2f4-449a-961b-d8490906ffdb",
        "result": {
          "elapsedMs": 0.8702079999993657,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:65110/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "2e0ee9d1-7871-40a7-b11e-c7df57a775fa",
              "state": "CREATED"
            },
            "elapsedMs": 0.8702079999993657,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:40:43 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"2e0ee9d1-7871-40a7-b11e-c7df57a775fa\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:40:43.288Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "5ffe0752-174f-4c0a-bf05-20037e2f1751"
      },
      {
        "id": "b9d33275-ce7b-429d-8599-d48070129cd0",
        "result": {
          "elapsedMs": 0.922458000000006,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:65110/api/orders/2e0ee9d1-7871-40a7-b11e-c7df57a775fa/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "2e0ee9d1-7871-40a7-b11e-c7df57a775fa",
              "state": "CANCELLED"
            },
            "elapsedMs": 0.922458000000006,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:40:43 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"2e0ee9d1-7871-40a7-b11e-c7df57a775fa\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:40:43.314Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "5ffe0752-174f-4c0a-bf05-20037e2f1751"
      },
      {
        "id": "c143b46d-013e-4da2-aad1-87cdada7daa8",
        "result": {
          "elapsedMs": 0.9421250000004875,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:65110/api/orders/2e0ee9d1-7871-40a7-b11e-c7df57a775fa/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "2e0ee9d1-7871-40a7-b11e-c7df57a775fa",
              "state": "FULFILLED"
            },
            "elapsedMs": 0.9421250000004875,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:40:43 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"2e0ee9d1-7871-40a7-b11e-c7df57a775fa\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:40:43.318Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "5ffe0752-174f-4c0a-bf05-20037e2f1751"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "f5d343e4-f485-4fb8-a378-a64cb5ea6ef1",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
            "version": 1
          },
          "rationale": "Validating that an order cancelled cannot be fulfilled subsequently.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ]
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
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
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
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
          "id": "e9e5039c-6df8-4fa5-a60c-059eed2aae7c",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
            "version": 1
          },
          "rationale": "Validating that an order cancelled cannot be fulfilled subsequently.",
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
                200,
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
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
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
          "id": "1a34df33-bc7d-4833-a538-073bd54a4cdb",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
            "version": 1
          },
          "rationale": "Validating that an order cancelled cannot be fulfilled subsequently.",
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
                200,
                409
              ],
              "extracts": [],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
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
      "id": "d76b693b-ef31-42a6-9db2-67e5ee04ea66",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
        "version": 1
      },
      "rationale": "Validating that an order cancelled cannot be fulfilled subsequently.",
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
            200,
            409
          ],
          "extracts": [],
          "id": "cancelled",
          "operationId": "POST /api/orders/{orderId}/cancel",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
              "value": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ]
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200,
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
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
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
      "id": "efd5a5a1-c80b-4480-859f-a071f4c652ef",
      "initialEvidenceId": "d51935fb-b8ac-460b-905c-8d04d5875c81",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "d76b693b-ef31-42a6-9db2-67e5ee04ea66",
      "originalJourneyId": "d76b693b-ef31-42a6-9db2-67e5ee04ea66",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
        "version": 1
      },
      "projectId": "9b0fe11e-d397-4673-ac2d-965bd6b2247a",
      "replayEvidenceIds": [
        "2b50647a-eb63-4dc6-9021-c22401a7a1e1"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "d51935fb-b8ac-460b-905c-8d04d5875c81"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "d51935fb-b8ac-460b-905c-8d04d5875c81",
            "2b50647a-eb63-4dc6-9021-c22401a7a1e1"
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
    "id": "d76b693b-ef31-42a6-9db2-67e5ee04ea66",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
      "version": 1
    },
    "rationale": "Validating that an order cancelled cannot be fulfilled subsequently.",
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
          200,
          409
        ],
        "extracts": [],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
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
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
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
    "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "350b0468-1ba9-47e7-976f-7030b5b5d89c"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "4e844a3a-8ff3-4b18-890e-8dbee214f0af",
        "resetStepIds": [
          "reset"
        ],
        "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
        "trialId": "a83453a0-7bf2-430f-ad16-2c0d91c95591",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "4e844a3a-8ff3-4b18-890e-8dbee214f0af",
        "id": "2b50647a-eb63-4dc6-9021-c22401a7a1e1",
        "observationIds": [
          "cfc7a22c-6bd6-4ecb-ad6b-dc65412203d6",
          "e1ffef25-abda-45f3-9316-5c9f98b01c38",
          "697cf8d0-c3ea-45f1-a0f9-4b25ab668dea"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "8142b4d0-fc2b-4f24-9ab6-b1dded824b1a",
          "version": 1
        },
        "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
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
        "trialId": "a83453a0-7bf2-430f-ad16-2c0d91c95591"
      },
      "observations": [
        {
          "id": "e1ffef25-abda-45f3-9316-5c9f98b01c38",
          "result": {
            "elapsedMs": 0.7156249999998181,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:65110/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "8ef373b1-84fc-4072-adc7-fc7923a72829",
                "state": "CREATED"
              },
              "elapsedMs": 0.7156249999998181,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:40:43 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"8ef373b1-84fc-4072-adc7-fc7923a72829\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:40:43.341Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "a83453a0-7bf2-430f-ad16-2c0d91c95591"
        },
        {
          "id": "cfc7a22c-6bd6-4ecb-ad6b-dc65412203d6",
          "result": {
            "elapsedMs": 0.5873340000007374,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:65110/api/orders/8ef373b1-84fc-4072-adc7-fc7923a72829/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "8ef373b1-84fc-4072-adc7-fc7923a72829",
                "state": "CANCELLED"
              },
              "elapsedMs": 0.5873340000007374,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:40:43 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"8ef373b1-84fc-4072-adc7-fc7923a72829\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:40:43.343Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "a83453a0-7bf2-430f-ad16-2c0d91c95591"
        },
        {
          "id": "697cf8d0-c3ea-45f1-a0f9-4b25ab668dea",
          "result": {
            "elapsedMs": 0.7376669999994192,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:65110/api/orders/8ef373b1-84fc-4072-adc7-fc7923a72829/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "8ef373b1-84fc-4072-adc7-fc7923a72829",
                "state": "FULFILLED"
              },
              "elapsedMs": 0.7376669999994192,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:40:43 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"8ef373b1-84fc-4072-adc7-fc7923a72829\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:40:43.345Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "a83453a0-7bf2-430f-ad16-2c0d91c95591"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "1ae77195-4079-4629-948e-f818610e6ed2",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
