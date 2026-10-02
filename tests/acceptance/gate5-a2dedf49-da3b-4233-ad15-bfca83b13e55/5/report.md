# GhostQA finding evidence

Finding: `6b8b7e36-88ca-408a-b785-ef31d0134855` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `728a0c9f-decd-4e6d-b914-9f80d661e4d5`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
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

- EXPLORATION: evidence `5850d2f7-55d4-46ff-8609-129f61a79ade`, trial `fe17f937-dffe-449a-ad4a-4c85fe34dcfa`, baseline `8c4c498b-4c13-4329-a636-6fbb73aa1ff4`, verdict VIOLATED.
- REPLAY: evidence `512c968b-9526-44c8-9c8f-8cfbda564ba0`, trial `98af1cc7-45ec-4011-922d-296ca7d79609`, baseline `e8c08166-17ee-4859-8c7b-8716a76ed8ef`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `10b9fa48-a1cf-4d18-b965-9e08498eb172`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `04c884e0-96ef-4f75-9825-af7bd7d95ff7`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `90011955-a9ed-45b8-838d-fda024e24025`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:05:04.834Z",
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
    "id": "1adc0e0c-3d89-41be-9a5e-21e14b97811b",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
      "version": 1
    },
    "rationale": "Verifies that an order which has been cancelled cannot subsequently be fulfilled.",
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
    "acceptedAt": "2026-10-01T22:05:04.834Z",
    "deadlineAt": "2026-10-01T22:15:04.834Z",
    "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
    "trialIds": [
      "fe17f937-dffe-449a-ad4a-4c85fe34dcfa",
      "98af1cc7-45ec-4011-922d-296ca7d79609"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "6b8b7e36-88ca-408a-b785-ef31d0134855",
    "initialEvidenceId": "5850d2f7-55d4-46ff-8609-129f61a79ade",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "1adc0e0c-3d89-41be-9a5e-21e14b97811b",
    "originalJourneyId": "1adc0e0c-3d89-41be-9a5e-21e14b97811b",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
      "version": 1
    },
    "projectId": "bf91a935-d564-44bd-b738-8dc98b50f9d5",
    "replayEvidenceIds": [
      "512c968b-9526-44c8-9c8f-8cfbda564ba0"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "5850d2f7-55d4-46ff-8609-129f61a79ade"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "5850d2f7-55d4-46ff-8609-129f61a79ade",
          "512c968b-9526-44c8-9c8f-8cfbda564ba0"
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
        "8d14074b-d082-4b3d-8166-02410c65ec16"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "8c4c498b-4c13-4329-a636-6fbb73aa1ff4",
      "resetStepIds": [
        "reset"
      ],
      "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
      "trialId": "fe17f937-dffe-449a-ad4a-4c85fe34dcfa",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "8c4c498b-4c13-4329-a636-6fbb73aa1ff4",
      "id": "5850d2f7-55d4-46ff-8609-129f61a79ade",
      "observationIds": [
        "a6242115-0925-4452-8dc9-7bf3325457f8",
        "9f48a9ef-71c4-42a3-b738-817f9cf4325f",
        "266e885c-e252-43bb-b59e-c895681e31c0"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
        "version": 1
      },
      "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
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
      "trialId": "fe17f937-dffe-449a-ad4a-4c85fe34dcfa"
    },
    "observations": [
      {
        "id": "9f48a9ef-71c4-42a3-b738-817f9cf4325f",
        "result": {
          "elapsedMs": 2.0772499999984575,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:52837/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "a3e538d4-05b5-46f4-9e8b-31150893edee",
              "state": "CREATED"
            },
            "elapsedMs": 2.0772499999984575,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:05:09 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"a3e538d4-05b5-46f4-9e8b-31150893edee\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:05:09.333Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "fe17f937-dffe-449a-ad4a-4c85fe34dcfa"
      },
      {
        "id": "266e885c-e252-43bb-b59e-c895681e31c0",
        "result": {
          "elapsedMs": 2.1170840000013413,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:52837/api/orders/a3e538d4-05b5-46f4-9e8b-31150893edee/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "a3e538d4-05b5-46f4-9e8b-31150893edee",
              "state": "CANCELLED"
            },
            "elapsedMs": 2.1170840000013413,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:05:09 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"a3e538d4-05b5-46f4-9e8b-31150893edee\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:05:09.341Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "fe17f937-dffe-449a-ad4a-4c85fe34dcfa"
      },
      {
        "id": "a6242115-0925-4452-8dc9-7bf3325457f8",
        "result": {
          "elapsedMs": 1.6977920000026643,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:52837/api/orders/a3e538d4-05b5-46f4-9e8b-31150893edee/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "a3e538d4-05b5-46f4-9e8b-31150893edee",
              "state": "FULFILLED"
            },
            "elapsedMs": 1.6977920000026643,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:05:09 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"a3e538d4-05b5-46f4-9e8b-31150893edee\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:05:09.349Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "fe17f937-dffe-449a-ad4a-4c85fe34dcfa"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "10b9fa48-a1cf-4d18-b965-9e08498eb172",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
            "version": 1
          },
          "rationale": "Verifies that an order which has been cancelled cannot subsequently be fulfilled.",
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
          "id": "04c884e0-96ef-4f75-9825-af7bd7d95ff7",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
            "version": 1
          },
          "rationale": "Verifies that an order which has been cancelled cannot subsequently be fulfilled.",
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
          "id": "90011955-a9ed-45b8-838d-fda024e24025",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
            "version": 1
          },
          "rationale": "Verifies that an order which has been cancelled cannot subsequently be fulfilled.",
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
      "id": "1adc0e0c-3d89-41be-9a5e-21e14b97811b",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
        "version": 1
      },
      "rationale": "Verifies that an order which has been cancelled cannot subsequently be fulfilled.",
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
      "id": "6b8b7e36-88ca-408a-b785-ef31d0134855",
      "initialEvidenceId": "5850d2f7-55d4-46ff-8609-129f61a79ade",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "1adc0e0c-3d89-41be-9a5e-21e14b97811b",
      "originalJourneyId": "1adc0e0c-3d89-41be-9a5e-21e14b97811b",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
        "version": 1
      },
      "projectId": "bf91a935-d564-44bd-b738-8dc98b50f9d5",
      "replayEvidenceIds": [
        "512c968b-9526-44c8-9c8f-8cfbda564ba0"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "5850d2f7-55d4-46ff-8609-129f61a79ade"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "5850d2f7-55d4-46ff-8609-129f61a79ade",
            "512c968b-9526-44c8-9c8f-8cfbda564ba0"
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
    "id": "1adc0e0c-3d89-41be-9a5e-21e14b97811b",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
      "version": 1
    },
    "rationale": "Verifies that an order which has been cancelled cannot subsequently be fulfilled.",
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
    "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "8d14074b-d082-4b3d-8166-02410c65ec16"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "e8c08166-17ee-4859-8c7b-8716a76ed8ef",
        "resetStepIds": [
          "reset"
        ],
        "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
        "trialId": "98af1cc7-45ec-4011-922d-296ca7d79609",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "e8c08166-17ee-4859-8c7b-8716a76ed8ef",
        "id": "512c968b-9526-44c8-9c8f-8cfbda564ba0",
        "observationIds": [
          "21510679-8392-4bc2-a494-b023e2d62e58",
          "987f00a2-f235-46b2-83ea-b5c3f123692d",
          "beb3a994-2b54-4345-8b47-b97204bd4a24"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "728a0c9f-decd-4e6d-b914-9f80d661e4d5",
          "version": 1
        },
        "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
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
        "trialId": "98af1cc7-45ec-4011-922d-296ca7d79609"
      },
      "observations": [
        {
          "id": "21510679-8392-4bc2-a494-b023e2d62e58",
          "result": {
            "elapsedMs": 2.391875000001164,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:52837/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "81028366-02d7-41e5-a4fb-8b0e43b5ed78",
                "state": "CREATED"
              },
              "elapsedMs": 2.391875000001164,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:05:09 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"81028366-02d7-41e5-a4fb-8b0e43b5ed78\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:05:09.398Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "98af1cc7-45ec-4011-922d-296ca7d79609"
        },
        {
          "id": "987f00a2-f235-46b2-83ea-b5c3f123692d",
          "result": {
            "elapsedMs": 1.957749999997759,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:52837/api/orders/81028366-02d7-41e5-a4fb-8b0e43b5ed78/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "81028366-02d7-41e5-a4fb-8b0e43b5ed78",
                "state": "CANCELLED"
              },
              "elapsedMs": 1.957749999997759,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:05:09 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"81028366-02d7-41e5-a4fb-8b0e43b5ed78\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:05:09.403Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "98af1cc7-45ec-4011-922d-296ca7d79609"
        },
        {
          "id": "beb3a994-2b54-4345-8b47-b97204bd4a24",
          "result": {
            "elapsedMs": 1.9144999999989523,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:52837/api/orders/81028366-02d7-41e5-a4fb-8b0e43b5ed78/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "81028366-02d7-41e5-a4fb-8b0e43b5ed78",
                "state": "FULFILLED"
              },
              "elapsedMs": 1.9144999999989523,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:05:09 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"81028366-02d7-41e5-a4fb-8b0e43b5ed78\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:05:09.409Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "98af1cc7-45ec-4011-922d-296ca7d79609"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "884bd709-a5b6-4d46-bff7-6e23e5588633",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
