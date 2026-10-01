# GhostQA finding evidence

Finding: `f923ccc2-f657-40ba-9184-134a6c28cfd7` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `a84466b9-0303-479a-b3c0-2c45ddf1c63f`, version 1, canonical hash `04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9`.
Approval provenance: DEVELOPER; source `an item observed as UNAVAILABLE must not later be observed as ALLOCATED within the same fresh trial`; eligible as of run acceptance: true.

Original journey length: 3. Best verified journey length: 3.
This is the shortest verified sequence found.
It is locally irreducible under attempted deletion strategy.
Local minimization stop reason: LOCAL MINIMUM.
Truncated: no.

## Expected invariant

When the applicability conditions hold, every approved assertion must be satisfied:

- `{"kind":"json","pointer":"/state","stepId":"later"}` not-equals `{"kind":"literal","value":"ALLOCATED"}`

## Evidence references

- EXPLORATION: evidence `d63a5610-2e8f-41eb-a594-c36d358709bd`, trial `c44212db-646c-473c-86ac-c32b7404291c`, baseline `410d803e-e88d-4e97-a0bc-d92791f363f8`, verdict VIOLATED.
- REPLAY: evidence `c33f51e3-635b-43cf-bdfa-8753323dabf7`, trial `18a24bf3-29b2-4c73-a0f4-e765e057902e`, baseline `4c3c3ea6-e5ff-44c3-9a51-b9650df36eb0`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/items`
2. `unavailable` — `POST /api/items/{itemId}/unavailable`
3. `later` — `POST /api/items/{itemId}/allocate`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `e4d63cc4-1a17-4751-99df-f102f6fa43c8`.
- Remove `unavailable`: rejected; PREDICATE STEP REQUIRED; candidate `b5559008-733e-4335-9cf3-eb2f29b6ffd2`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `a09ed7b9-e1cb-4d40-88ff-ab21c171714f`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T21:08:55.044Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "an item observed as UNAVAILABLE must not later be observed as ALLOCATED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "unavailable",
        "producer": "create",
        "variable": "itemId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "itemId"
      }
    ],
    "id": "c202631f-89d0-4c45-867c-6f336b2b9d9f",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
      "version": 1
    },
    "rationale": "Journey testing that an item marked unavailable cannot subsequently be allocated.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "itemId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/items",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "unavailable",
        "operationId": "POST /api/items/{itemId}/unavailable",
        "parameters": [
          {
            "location": "path",
            "name": "itemId",
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
        "operationId": "POST /api/items/{itemId}/allocate",
        "parameters": [
          {
            "location": "path",
            "name": "itemId",
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
    "acceptedAt": "2026-10-01T21:08:55.044Z",
    "deadlineAt": "2026-10-01T21:18:55.044Z",
    "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
    "trialIds": [
      "c44212db-646c-473c-86ac-c32b7404291c",
      "18a24bf3-29b2-4c73-a0f4-e765e057902e"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "f923ccc2-f657-40ba-9184-134a6c28cfd7",
    "initialEvidenceId": "d63a5610-2e8f-41eb-a594-c36d358709bd",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "c202631f-89d0-4c45-867c-6f336b2b9d9f",
    "originalJourneyId": "c202631f-89d0-4c45-867c-6f336b2b9d9f",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
      "version": 1
    },
    "projectId": "dc6954ee-3caa-4525-b731-51e7ede919f6",
    "replayEvidenceIds": [
      "c33f51e3-635b-43cf-bdfa-8753323dabf7"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "d63a5610-2e8f-41eb-a594-c36d358709bd"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "d63a5610-2e8f-41eb-a594-c36d358709bd",
          "c33f51e3-635b-43cf-bdfa-8753323dabf7"
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
        "d5fd4846-a5b7-4878-9e89-b26e2c82be42"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "410d803e-e88d-4e97-a0bc-d92791f363f8",
      "resetStepIds": [
        "reset"
      ],
      "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
      "trialId": "c44212db-646c-473c-86ac-c32b7404291c",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "410d803e-e88d-4e97-a0bc-d92791f363f8",
      "id": "d63a5610-2e8f-41eb-a594-c36d358709bd",
      "observationIds": [
        "93d10ad6-3e73-43bd-a875-852500702df5",
        "1d0910dd-6ffc-4637-85d1-4797971b0a00",
        "5c9703df-d7bf-428e-aca0-e6979b78fcc4"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
        "version": 1
      },
      "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
      "symbolicOperands": {
        "applicability": [
          {
            "left": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "unavailable"
            },
            "op": "equals",
            "right": {
              "kind": "literal",
              "value": "UNAVAILABLE"
            }
          },
          {
            "left": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "unavailable"
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
              "stepId": "unavailable"
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
              "value": "ALLOCATED"
            }
          }
        ],
        "executionOrder": [
          {
            "operationId": "POST /api/items",
            "ordinal": 0,
            "stepId": "create"
          },
          {
            "operationId": "POST /api/items/{itemId}/unavailable",
            "ordinal": 1,
            "stepId": "unavailable"
          },
          {
            "operationId": "POST /api/items/{itemId}/allocate",
            "ordinal": 2,
            "stepId": "later"
          }
        ]
      },
      "trialId": "c44212db-646c-473c-86ac-c32b7404291c"
    },
    "observations": [
      {
        "id": "5c9703df-d7bf-428e-aca0-e6979b78fcc4",
        "result": {
          "elapsedMs": 1.876750000010361,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items",
            "url": "http://127.0.0.1:57892/api/items"
          },
          "sanitizedResponse": {
            "body": {
              "id": "246bb7a1-89b0-4f1f-8827-fb89ebcf57b3",
              "state": "AVAILABLE"
            },
            "elapsedMs": 1.876750000010361,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:57 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"246bb7a1-89b0-4f1f-8827-fb89ebcf57b3\",\"state\":\"AVAILABLE\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:57.902Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "c44212db-646c-473c-86ac-c32b7404291c"
      },
      {
        "id": "1d0910dd-6ffc-4637-85d1-4797971b0a00",
        "result": {
          "elapsedMs": 1.8896660000027623,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items/{itemId}/unavailable",
            "url": "http://127.0.0.1:57892/api/items/246bb7a1-89b0-4f1f-8827-fb89ebcf57b3/unavailable"
          },
          "sanitizedResponse": {
            "body": {
              "id": "246bb7a1-89b0-4f1f-8827-fb89ebcf57b3",
              "state": "UNAVAILABLE"
            },
            "elapsedMs": 1.8896660000027623,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:57 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"246bb7a1-89b0-4f1f-8827-fb89ebcf57b3\",\"state\":\"UNAVAILABLE\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:57.909Z",
          "status": 200,
          "stepId": "unavailable",
          "truncated": false
        },
        "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
        "stateMappings": [],
        "stepId": "unavailable",
        "trialId": "c44212db-646c-473c-86ac-c32b7404291c"
      },
      {
        "id": "93d10ad6-3e73-43bd-a875-852500702df5",
        "result": {
          "elapsedMs": 1.750291999996989,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items/{itemId}/allocate",
            "url": "http://127.0.0.1:57892/api/items/246bb7a1-89b0-4f1f-8827-fb89ebcf57b3/allocate"
          },
          "sanitizedResponse": {
            "body": {
              "id": "246bb7a1-89b0-4f1f-8827-fb89ebcf57b3",
              "state": "ALLOCATED"
            },
            "elapsedMs": 1.750291999996989,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:57 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"246bb7a1-89b0-4f1f-8827-fb89ebcf57b3\",\"state\":\"ALLOCATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:57.915Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "c44212db-646c-473c-86ac-c32b7404291c"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "e4d63cc4-1a17-4751-99df-f102f6fa43c8",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
            "version": 1
          },
          "rationale": "Journey testing that an item marked unavailable cannot subsequently be allocated.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "unavailable",
              "operationId": "POST /api/items/{itemId}/unavailable",
              "parameters": [
                {
                  "location": "path",
                  "name": "itemId",
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
              "operationId": "POST /api/items/{itemId}/allocate",
              "parameters": [
                {
                  "location": "path",
                  "name": "itemId",
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
              "variable": "itemId"
            }
          ],
          "id": "b5559008-733e-4335-9cf3-eb2f29b6ffd2",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
            "version": 1
          },
          "rationale": "Journey testing that an item marked unavailable cannot subsequently be allocated.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "itemId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/items",
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
              "operationId": "POST /api/items/{itemId}/allocate",
              "parameters": [
                {
                  "location": "path",
                  "name": "itemId",
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
        "removedStepId": "unavailable"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "unavailable",
              "producer": "create",
              "variable": "itemId"
            }
          ],
          "id": "a09ed7b9-e1cb-4d40-88ff-ab21c171714f",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
            "version": 1
          },
          "rationale": "Journey testing that an item marked unavailable cannot subsequently be allocated.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "itemId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/items",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "unavailable",
              "operationId": "POST /api/items/{itemId}/unavailable",
              "parameters": [
                {
                  "location": "path",
                  "name": "itemId",
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
          "consumer": "unavailable",
          "producer": "create",
          "variable": "itemId"
        },
        {
          "consumer": "later",
          "producer": "create",
          "variable": "itemId"
        }
      ],
      "id": "c202631f-89d0-4c45-867c-6f336b2b9d9f",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
        "version": 1
      },
      "rationale": "Journey testing that an item marked unavailable cannot subsequently be allocated.",
      "steps": [
        {
          "bodyBindings": [],
          "expectedStatuses": [
            201
          ],
          "extracts": [
            {
              "expectedType": "string",
              "name": "itemId",
              "sensitive": false,
              "source": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ],
          "id": "create",
          "operationId": "POST /api/items",
          "parameters": []
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200,
            409
          ],
          "extracts": [],
          "id": "unavailable",
          "operationId": "POST /api/items/{itemId}/unavailable",
          "parameters": [
            {
              "location": "path",
              "name": "itemId",
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
          "operationId": "POST /api/items/{itemId}/allocate",
          "parameters": [
            {
              "location": "path",
              "name": "itemId",
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
      "id": "f923ccc2-f657-40ba-9184-134a6c28cfd7",
      "initialEvidenceId": "d63a5610-2e8f-41eb-a594-c36d358709bd",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "c202631f-89d0-4c45-867c-6f336b2b9d9f",
      "originalJourneyId": "c202631f-89d0-4c45-867c-6f336b2b9d9f",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
        "version": 1
      },
      "projectId": "dc6954ee-3caa-4525-b731-51e7ede919f6",
      "replayEvidenceIds": [
        "c33f51e3-635b-43cf-bdfa-8753323dabf7"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "d63a5610-2e8f-41eb-a594-c36d358709bd"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "d63a5610-2e8f-41eb-a594-c36d358709bd",
            "c33f51e3-635b-43cf-bdfa-8753323dabf7"
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
        "consumer": "unavailable",
        "producer": "create",
        "variable": "itemId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "itemId"
      }
    ],
    "id": "c202631f-89d0-4c45-867c-6f336b2b9d9f",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
      "version": 1
    },
    "rationale": "Journey testing that an item marked unavailable cannot subsequently be allocated.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "itemId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/items",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "unavailable",
        "operationId": "POST /api/items/{itemId}/unavailable",
        "parameters": [
          {
            "location": "path",
            "name": "itemId",
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
        "operationId": "POST /api/items/{itemId}/allocate",
        "parameters": [
          {
            "location": "path",
            "name": "itemId",
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
          "stepId": "unavailable"
        },
        "op": "equals",
        "right": {
          "kind": "literal",
          "value": "UNAVAILABLE"
        }
      },
      {
        "left": {
          "kind": "json",
          "pointer": "/id",
          "stepId": "unavailable"
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
          "stepId": "unavailable"
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
          "value": "ALLOCATED"
        }
      }
    ],
    "canonicalHash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
    "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
    "source": "DEVELOPER",
    "sourceRef": "an item observed as UNAVAILABLE must not later be observed as ALLOCATED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
    "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "d5fd4846-a5b7-4878-9e89-b26e2c82be42"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "4c3c3ea6-e5ff-44c3-9a51-b9650df36eb0",
        "resetStepIds": [
          "reset"
        ],
        "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
        "trialId": "18a24bf3-29b2-4c73-a0f4-e765e057902e",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "4c3c3ea6-e5ff-44c3-9a51-b9650df36eb0",
        "id": "c33f51e3-635b-43cf-bdfa-8753323dabf7",
        "observationIds": [
          "a3930292-3c40-4761-b0f7-83ecf2672539",
          "6c20592e-2609-483a-8338-5949806c7ac3",
          "93f7a9e6-3c61-49f6-8ade-5dd468013bc3"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
          "id": "a84466b9-0303-479a-b3c0-2c45ddf1c63f",
          "version": 1
        },
        "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
        "symbolicOperands": {
          "applicability": [
            {
              "left": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "unavailable"
              },
              "op": "equals",
              "right": {
                "kind": "literal",
                "value": "UNAVAILABLE"
              }
            },
            {
              "left": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "unavailable"
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
                "stepId": "unavailable"
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
                "value": "ALLOCATED"
              }
            }
          ],
          "executionOrder": [
            {
              "operationId": "POST /api/items",
              "ordinal": 0,
              "stepId": "create"
            },
            {
              "operationId": "POST /api/items/{itemId}/unavailable",
              "ordinal": 1,
              "stepId": "unavailable"
            },
            {
              "operationId": "POST /api/items/{itemId}/allocate",
              "ordinal": 2,
              "stepId": "later"
            }
          ]
        },
        "trialId": "18a24bf3-29b2-4c73-a0f4-e765e057902e"
      },
      "observations": [
        {
          "id": "a3930292-3c40-4761-b0f7-83ecf2672539",
          "result": {
            "elapsedMs": 1.8362080000079004,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items",
              "url": "http://127.0.0.1:57892/api/items"
            },
            "sanitizedResponse": {
              "body": {
                "id": "6103f7e0-4996-4426-aa69-f9b2d751b51a",
                "state": "AVAILABLE"
              },
              "elapsedMs": 1.8362080000079004,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:57 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"6103f7e0-4996-4426-aa69-f9b2d751b51a\",\"state\":\"AVAILABLE\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:57.955Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "18a24bf3-29b2-4c73-a0f4-e765e057902e"
        },
        {
          "id": "6c20592e-2609-483a-8338-5949806c7ac3",
          "result": {
            "elapsedMs": 1.5297500000015134,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items/{itemId}/unavailable",
              "url": "http://127.0.0.1:57892/api/items/6103f7e0-4996-4426-aa69-f9b2d751b51a/unavailable"
            },
            "sanitizedResponse": {
              "body": {
                "id": "6103f7e0-4996-4426-aa69-f9b2d751b51a",
                "state": "UNAVAILABLE"
              },
              "elapsedMs": 1.5297500000015134,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:57 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"6103f7e0-4996-4426-aa69-f9b2d751b51a\",\"state\":\"UNAVAILABLE\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:57.960Z",
            "status": 200,
            "stepId": "unavailable",
            "truncated": false
          },
          "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
          "stateMappings": [],
          "stepId": "unavailable",
          "trialId": "18a24bf3-29b2-4c73-a0f4-e765e057902e"
        },
        {
          "id": "93f7a9e6-3c61-49f6-8ade-5dd468013bc3",
          "result": {
            "elapsedMs": 1.6464169999962905,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items/{itemId}/allocate",
              "url": "http://127.0.0.1:57892/api/items/6103f7e0-4996-4426-aa69-f9b2d751b51a/allocate"
            },
            "sanitizedResponse": {
              "body": {
                "id": "6103f7e0-4996-4426-aa69-f9b2d751b51a",
                "state": "ALLOCATED"
              },
              "elapsedMs": 1.6464169999962905,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:57 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"6103f7e0-4996-4426-aa69-f9b2d751b51a\",\"state\":\"ALLOCATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:57.965Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "18a24bf3-29b2-4c73-a0f4-e765e057902e"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "1c97f81d-0515-43b4-8e0d-5595567dc86b",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
