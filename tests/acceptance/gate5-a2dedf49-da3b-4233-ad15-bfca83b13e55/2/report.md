# GhostQA finding evidence

Finding: `2148359c-2d05-4168-afd3-2db028450fde` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `b0273b10-4c38-4dfc-978e-64894bb850a2`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
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

- EXPLORATION: evidence `dff3134b-b4af-4ef7-8ace-b39592fdb066`, trial `1edf6003-6e5a-4c54-8057-e688a20c8131`, baseline `3f0ccd8b-750c-4775-81aa-176f1affa3ac`, verdict VIOLATED.
- REPLAY: evidence `392fb786-2871-4b12-b8fa-bb3d03cb9907`, trial `95aafcd1-9267-48c7-b211-28f1de50a12a`, baseline `3ea54474-db77-46df-975f-7e82ceaa0acb`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `a648fb58-ae7d-4c0c-8463-efe9151af14d`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `7596bbfb-61d5-4603-88d3-1ae15836e990`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `a8838ab7-7584-4f1a-8b48-fb1a03ccad22`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:04:50.310Z",
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
    "id": "cd11c8b4-a029-405e-90d6-c4462c0fec07",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
      "version": 1
    },
    "rationale": "Journey to verify an order cancelled cannot be subsequently fulfilled.",
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
              "kind": "variable",
              "name": "orderId"
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
    "acceptedAt": "2026-10-01T22:04:50.310Z",
    "deadlineAt": "2026-10-01T22:14:50.310Z",
    "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
    "trialIds": [
      "1edf6003-6e5a-4c54-8057-e688a20c8131",
      "95aafcd1-9267-48c7-b211-28f1de50a12a"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "2148359c-2d05-4168-afd3-2db028450fde",
    "initialEvidenceId": "dff3134b-b4af-4ef7-8ace-b39592fdb066",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "cd11c8b4-a029-405e-90d6-c4462c0fec07",
    "originalJourneyId": "cd11c8b4-a029-405e-90d6-c4462c0fec07",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
      "version": 1
    },
    "projectId": "66469991-a3d4-483f-872d-a465b48af227",
    "replayEvidenceIds": [
      "392fb786-2871-4b12-b8fa-bb3d03cb9907"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "dff3134b-b4af-4ef7-8ace-b39592fdb066"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "dff3134b-b4af-4ef7-8ace-b39592fdb066",
          "392fb786-2871-4b12-b8fa-bb3d03cb9907"
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
        "e71069e3-c3ef-4362-aafa-9c0c99da7447"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "3f0ccd8b-750c-4775-81aa-176f1affa3ac",
      "resetStepIds": [
        "reset"
      ],
      "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
      "trialId": "1edf6003-6e5a-4c54-8057-e688a20c8131",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "3f0ccd8b-750c-4775-81aa-176f1affa3ac",
      "id": "dff3134b-b4af-4ef7-8ace-b39592fdb066",
      "observationIds": [
        "80da40d2-eda9-41bf-8f03-01704454130d",
        "20434ad1-cc91-40d5-8180-95ae9a49e01a",
        "cf356838-2fec-41c5-823b-f8e6327613d7"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
        "version": 1
      },
      "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
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
      "trialId": "1edf6003-6e5a-4c54-8057-e688a20c8131"
    },
    "observations": [
      {
        "id": "80da40d2-eda9-41bf-8f03-01704454130d",
        "result": {
          "elapsedMs": 2.2607499999994616,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:52783/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "ddfd6a55-fc17-4127-9792-6c5817010520",
              "state": "CREATED"
            },
            "elapsedMs": 2.2607499999994616,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:04:54 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"ddfd6a55-fc17-4127-9792-6c5817010520\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:04:54.277Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "1edf6003-6e5a-4c54-8057-e688a20c8131"
      },
      {
        "id": "20434ad1-cc91-40d5-8180-95ae9a49e01a",
        "result": {
          "elapsedMs": 3.033832999999504,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:52783/api/orders/ddfd6a55-fc17-4127-9792-6c5817010520/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "ddfd6a55-fc17-4127-9792-6c5817010520",
              "state": "CANCELLED"
            },
            "elapsedMs": 3.033832999999504,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:04:54 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"ddfd6a55-fc17-4127-9792-6c5817010520\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:04:54.294Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "1edf6003-6e5a-4c54-8057-e688a20c8131"
      },
      {
        "id": "cf356838-2fec-41c5-823b-f8e6327613d7",
        "result": {
          "elapsedMs": 3.872624999999971,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:52783/api/orders/ddfd6a55-fc17-4127-9792-6c5817010520/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "ddfd6a55-fc17-4127-9792-6c5817010520",
              "state": "FULFILLED"
            },
            "elapsedMs": 3.872624999999971,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:04:54 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"ddfd6a55-fc17-4127-9792-6c5817010520\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:04:54.307Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "1edf6003-6e5a-4c54-8057-e688a20c8131"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "a648fb58-ae7d-4c0c-8463-efe9151af14d",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
            "version": 1
          },
          "rationale": "Journey to verify an order cancelled cannot be subsequently fulfilled.",
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
                    "kind": "variable",
                    "name": "orderId"
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
          "id": "7596bbfb-61d5-4603-88d3-1ae15836e990",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
            "version": 1
          },
          "rationale": "Journey to verify an order cancelled cannot be subsequently fulfilled.",
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
          "id": "a8838ab7-7584-4f1a-8b48-fb1a03ccad22",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
            "version": 1
          },
          "rationale": "Journey to verify an order cancelled cannot be subsequently fulfilled.",
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
      "id": "cd11c8b4-a029-405e-90d6-c4462c0fec07",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
        "version": 1
      },
      "rationale": "Journey to verify an order cancelled cannot be subsequently fulfilled.",
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
                "kind": "variable",
                "name": "orderId"
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
      "id": "2148359c-2d05-4168-afd3-2db028450fde",
      "initialEvidenceId": "dff3134b-b4af-4ef7-8ace-b39592fdb066",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "cd11c8b4-a029-405e-90d6-c4462c0fec07",
      "originalJourneyId": "cd11c8b4-a029-405e-90d6-c4462c0fec07",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
        "version": 1
      },
      "projectId": "66469991-a3d4-483f-872d-a465b48af227",
      "replayEvidenceIds": [
        "392fb786-2871-4b12-b8fa-bb3d03cb9907"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "dff3134b-b4af-4ef7-8ace-b39592fdb066"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "dff3134b-b4af-4ef7-8ace-b39592fdb066",
            "392fb786-2871-4b12-b8fa-bb3d03cb9907"
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
    "id": "cd11c8b4-a029-405e-90d6-c4462c0fec07",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
      "version": 1
    },
    "rationale": "Journey to verify an order cancelled cannot be subsequently fulfilled.",
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
              "kind": "variable",
              "name": "orderId"
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
    "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "e71069e3-c3ef-4362-aafa-9c0c99da7447"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "3ea54474-db77-46df-975f-7e82ceaa0acb",
        "resetStepIds": [
          "reset"
        ],
        "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
        "trialId": "95aafcd1-9267-48c7-b211-28f1de50a12a",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "3ea54474-db77-46df-975f-7e82ceaa0acb",
        "id": "392fb786-2871-4b12-b8fa-bb3d03cb9907",
        "observationIds": [
          "dd3ea787-a498-4d89-bf2e-a7b9895e1126",
          "47306dc4-1a45-4710-8f2b-3c3660dad2ce",
          "56059897-f268-4790-8640-9ca8b63d2aef"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "b0273b10-4c38-4dfc-978e-64894bb850a2",
          "version": 1
        },
        "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
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
        "trialId": "95aafcd1-9267-48c7-b211-28f1de50a12a"
      },
      "observations": [
        {
          "id": "dd3ea787-a498-4d89-bf2e-a7b9895e1126",
          "result": {
            "elapsedMs": 2.380457999999635,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:52783/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "e8f5f8ed-7bb3-4218-a746-44430430a876",
                "state": "CREATED"
              },
              "elapsedMs": 2.380457999999635,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:04:54 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"e8f5f8ed-7bb3-4218-a746-44430430a876\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:04:54.404Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "95aafcd1-9267-48c7-b211-28f1de50a12a"
        },
        {
          "id": "56059897-f268-4790-8640-9ca8b63d2aef",
          "result": {
            "elapsedMs": 1.8452919999999722,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:52783/api/orders/e8f5f8ed-7bb3-4218-a746-44430430a876/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "e8f5f8ed-7bb3-4218-a746-44430430a876",
                "state": "CANCELLED"
              },
              "elapsedMs": 1.8452919999999722,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:04:54 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"e8f5f8ed-7bb3-4218-a746-44430430a876\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:04:54.413Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "95aafcd1-9267-48c7-b211-28f1de50a12a"
        },
        {
          "id": "47306dc4-1a45-4710-8f2b-3c3660dad2ce",
          "result": {
            "elapsedMs": 3.0289169999996375,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:52783/api/orders/e8f5f8ed-7bb3-4218-a746-44430430a876/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "e8f5f8ed-7bb3-4218-a746-44430430a876",
                "state": "FULFILLED"
              },
              "elapsedMs": 3.0289169999996375,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:04:54 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"e8f5f8ed-7bb3-4218-a746-44430430a876\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:04:54.419Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "95aafcd1-9267-48c7-b211-28f1de50a12a"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "c88164e4-9f41-48f9-966c-d134bedd7c21",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
