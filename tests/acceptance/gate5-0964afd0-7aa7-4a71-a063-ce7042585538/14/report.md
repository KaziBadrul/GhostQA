# GhostQA finding evidence

Finding: `d5b7df61-3d29-46ad-ae73-ba212b0607cf` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `6aa7c719-cfcb-4ed0-ad79-2e811c764a54`, version 1, canonical hash `04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9`.
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

- EXPLORATION: evidence `cd1d833c-fae6-4e04-bd4c-9cd4149ebd9d`, trial `ff7164a4-c979-4810-bca6-1b6cd5b6eba8`, baseline `1dfcb3d2-aade-4974-8a95-ba45737a1614`, verdict VIOLATED.
- REPLAY: evidence `76df9e44-7477-488c-a071-f9fe221aaac7`, trial `e07b2703-ba26-4a4d-a15a-8acf115ebe6b`, baseline `bcaeaf68-1b6a-4bb0-9614-151f8b08bc77`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/items`
2. `unavailable` — `POST /api/items/{itemId}/unavailable`
3. `later` — `POST /api/items/{itemId}/allocate`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `cd043530-5df2-43d1-8980-1284e7c3d648`.
- Remove `unavailable`: rejected; PREDICATE STEP REQUIRED; candidate `f531ae40-e6e7-48d5-b62c-d3c3706e61a5`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `f2a1aef0-82c4-4fa2-85a9-ce7ee67461d8`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T20:41:46.230Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "an item observed as UNAVAILABLE must not later be observed as ALLOCATED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "unavailable",
        "producer": "create",
        "variable": "createdId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "createdId"
      }
    ],
    "id": "ec721bb3-5b02-484c-b0c2-1e77405e11ff",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
      "version": 1
    },
    "rationale": "Journey to test that an item marked UNAVAILABLE cannot be subsequently allocated.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "createdId",
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
    "acceptedAt": "2026-10-01T20:41:46.230Z",
    "deadlineAt": "2026-10-01T20:51:46.230Z",
    "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
    "trialIds": [
      "ff7164a4-c979-4810-bca6-1b6cd5b6eba8",
      "e07b2703-ba26-4a4d-a15a-8acf115ebe6b"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "d5b7df61-3d29-46ad-ae73-ba212b0607cf",
    "initialEvidenceId": "cd1d833c-fae6-4e04-bd4c-9cd4149ebd9d",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "ec721bb3-5b02-484c-b0c2-1e77405e11ff",
    "originalJourneyId": "ec721bb3-5b02-484c-b0c2-1e77405e11ff",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
      "version": 1
    },
    "projectId": "fca79328-7861-4b6d-b0a7-53712856f5f8",
    "replayEvidenceIds": [
      "76df9e44-7477-488c-a071-f9fe221aaac7"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "cd1d833c-fae6-4e04-bd4c-9cd4149ebd9d"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "cd1d833c-fae6-4e04-bd4c-9cd4149ebd9d",
          "76df9e44-7477-488c-a071-f9fe221aaac7"
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
        "02598e91-162c-4304-b649-b219f784d43d"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "1dfcb3d2-aade-4974-8a95-ba45737a1614",
      "resetStepIds": [
        "reset"
      ],
      "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
      "trialId": "ff7164a4-c979-4810-bca6-1b6cd5b6eba8",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "1dfcb3d2-aade-4974-8a95-ba45737a1614",
      "id": "cd1d833c-fae6-4e04-bd4c-9cd4149ebd9d",
      "observationIds": [
        "edace441-7141-4add-8046-2f38207eb375",
        "2c89e1a0-82ea-4e6f-b142-a417bc19b71d",
        "83973af7-b53a-433c-81ea-df952c6979bc"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
        "version": 1
      },
      "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
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
      "trialId": "ff7164a4-c979-4810-bca6-1b6cd5b6eba8"
    },
    "observations": [
      {
        "id": "edace441-7141-4add-8046-2f38207eb375",
        "result": {
          "elapsedMs": 0.5229169999947771,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items",
            "url": "http://127.0.0.1:65338/api/items"
          },
          "sanitizedResponse": {
            "body": {
              "id": "811295fb-c3b4-4788-a4ce-7888daf34293",
              "state": "AVAILABLE"
            },
            "elapsedMs": 0.5229169999947771,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:41:49 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"811295fb-c3b4-4788-a4ce-7888daf34293\",\"state\":\"AVAILABLE\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:41:49.376Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "ff7164a4-c979-4810-bca6-1b6cd5b6eba8"
      },
      {
        "id": "83973af7-b53a-433c-81ea-df952c6979bc",
        "result": {
          "elapsedMs": 0.4632910000073025,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items/{itemId}/unavailable",
            "url": "http://127.0.0.1:65338/api/items/811295fb-c3b4-4788-a4ce-7888daf34293/unavailable"
          },
          "sanitizedResponse": {
            "body": {
              "id": "811295fb-c3b4-4788-a4ce-7888daf34293",
              "state": "UNAVAILABLE"
            },
            "elapsedMs": 0.4632910000073025,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:41:49 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"811295fb-c3b4-4788-a4ce-7888daf34293\",\"state\":\"UNAVAILABLE\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:41:49.379Z",
          "status": 200,
          "stepId": "unavailable",
          "truncated": false
        },
        "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
        "stateMappings": [],
        "stepId": "unavailable",
        "trialId": "ff7164a4-c979-4810-bca6-1b6cd5b6eba8"
      },
      {
        "id": "2c89e1a0-82ea-4e6f-b142-a417bc19b71d",
        "result": {
          "elapsedMs": 0.5335830000112765,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/items/{itemId}/allocate",
            "url": "http://127.0.0.1:65338/api/items/811295fb-c3b4-4788-a4ce-7888daf34293/allocate"
          },
          "sanitizedResponse": {
            "body": {
              "id": "811295fb-c3b4-4788-a4ce-7888daf34293",
              "state": "ALLOCATED"
            },
            "elapsedMs": 0.5335830000112765,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 20:41:49 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"811295fb-c3b4-4788-a4ce-7888daf34293\",\"state\":\"ALLOCATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T20:41:49.382Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "ff7164a4-c979-4810-bca6-1b6cd5b6eba8"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "cd043530-5df2-43d1-8980-1284e7c3d648",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
            "version": 1
          },
          "rationale": "Journey to test that an item marked UNAVAILABLE cannot be subsequently allocated.",
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
              "variable": "createdId"
            }
          ],
          "id": "f531ae40-e6e7-48d5-b62c-d3c3706e61a5",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
            "version": 1
          },
          "rationale": "Journey to test that an item marked UNAVAILABLE cannot be subsequently allocated.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "createdId",
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
              "variable": "createdId"
            }
          ],
          "id": "f2a1aef0-82c4-4fa2-85a9-ce7ee67461d8",
          "predicateRef": {
            "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
            "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
            "version": 1
          },
          "rationale": "Journey to test that an item marked UNAVAILABLE cannot be subsequently allocated.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "createdId",
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
          "variable": "createdId"
        },
        {
          "consumer": "later",
          "producer": "create",
          "variable": "createdId"
        }
      ],
      "id": "ec721bb3-5b02-484c-b0c2-1e77405e11ff",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
        "version": 1
      },
      "rationale": "Journey to test that an item marked UNAVAILABLE cannot be subsequently allocated.",
      "steps": [
        {
          "bodyBindings": [],
          "expectedStatuses": [
            201
          ],
          "extracts": [
            {
              "expectedType": "string",
              "name": "createdId",
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
      "id": "d5b7df61-3d29-46ad-ae73-ba212b0607cf",
      "initialEvidenceId": "cd1d833c-fae6-4e04-bd4c-9cd4149ebd9d",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "ec721bb3-5b02-484c-b0c2-1e77405e11ff",
      "originalJourneyId": "ec721bb3-5b02-484c-b0c2-1e77405e11ff",
      "predicateRef": {
        "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
        "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
        "version": 1
      },
      "projectId": "fca79328-7861-4b6d-b0a7-53712856f5f8",
      "replayEvidenceIds": [
        "76df9e44-7477-488c-a071-f9fe221aaac7"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "cd1d833c-fae6-4e04-bd4c-9cd4149ebd9d"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "cd1d833c-fae6-4e04-bd4c-9cd4149ebd9d",
            "76df9e44-7477-488c-a071-f9fe221aaac7"
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
        "variable": "createdId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "createdId"
      }
    ],
    "id": "ec721bb3-5b02-484c-b0c2-1e77405e11ff",
    "predicateRef": {
      "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
      "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
      "version": 1
    },
    "rationale": "Journey to test that an item marked UNAVAILABLE cannot be subsequently allocated.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "createdId",
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
    "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
    "source": "DEVELOPER",
    "sourceRef": "an item observed as UNAVAILABLE must not later be observed as ALLOCATED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
    "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "02598e91-162c-4304-b649-b219f784d43d"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "bcaeaf68-1b6a-4bb0-9614-151f8b08bc77",
        "resetStepIds": [
          "reset"
        ],
        "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
        "trialId": "e07b2703-ba26-4a4d-a15a-8acf115ebe6b",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "bcaeaf68-1b6a-4bb0-9614-151f8b08bc77",
        "id": "76df9e44-7477-488c-a071-f9fe221aaac7",
        "observationIds": [
          "53c1008b-c62e-4b02-a7c6-921c85b7c87e",
          "edae3812-ebfa-4665-8edc-8b52cea84b59",
          "02ef9cdf-67dc-42ba-b8d8-635074199a3d"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "04faaaafa43156f51b44a05d92aedfafdab4503a3d5327042b74b4574f761da9",
          "id": "6aa7c719-cfcb-4ed0-ad79-2e811c764a54",
          "version": 1
        },
        "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
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
        "trialId": "e07b2703-ba26-4a4d-a15a-8acf115ebe6b"
      },
      "observations": [
        {
          "id": "edae3812-ebfa-4665-8edc-8b52cea84b59",
          "result": {
            "elapsedMs": 0.42062499999883585,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items",
              "url": "http://127.0.0.1:65338/api/items"
            },
            "sanitizedResponse": {
              "body": {
                "id": "21ea172b-7b32-4b66-8279-1bfebd955a7e",
                "state": "AVAILABLE"
              },
              "elapsedMs": 0.42062499999883585,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:41:49 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"21ea172b-7b32-4b66-8279-1bfebd955a7e\",\"state\":\"AVAILABLE\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:41:49.399Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "e07b2703-ba26-4a4d-a15a-8acf115ebe6b"
        },
        {
          "id": "53c1008b-c62e-4b02-a7c6-921c85b7c87e",
          "result": {
            "elapsedMs": 0.48066599998855963,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items/{itemId}/unavailable",
              "url": "http://127.0.0.1:65338/api/items/21ea172b-7b32-4b66-8279-1bfebd955a7e/unavailable"
            },
            "sanitizedResponse": {
              "body": {
                "id": "21ea172b-7b32-4b66-8279-1bfebd955a7e",
                "state": "UNAVAILABLE"
              },
              "elapsedMs": 0.48066599998855963,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:41:49 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"21ea172b-7b32-4b66-8279-1bfebd955a7e\",\"state\":\"UNAVAILABLE\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:41:49.401Z",
            "status": 200,
            "stepId": "unavailable",
            "truncated": false
          },
          "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
          "stateMappings": [],
          "stepId": "unavailable",
          "trialId": "e07b2703-ba26-4a4d-a15a-8acf115ebe6b"
        },
        {
          "id": "02ef9cdf-67dc-42ba-b8d8-635074199a3d",
          "result": {
            "elapsedMs": 0.3945830000011483,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/items/{itemId}/allocate",
              "url": "http://127.0.0.1:65338/api/items/21ea172b-7b32-4b66-8279-1bfebd955a7e/allocate"
            },
            "sanitizedResponse": {
              "body": {
                "id": "21ea172b-7b32-4b66-8279-1bfebd955a7e",
                "state": "ALLOCATED"
              },
              "elapsedMs": 0.3945830000011483,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 20:41:49 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"21ea172b-7b32-4b66-8279-1bfebd955a7e\",\"state\":\"ALLOCATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T20:41:49.403Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "e07b2703-ba26-4a4d-a15a-8acf115ebe6b"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "90c02d8a-590d-47db-9e25-04a734c1cb2b",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
