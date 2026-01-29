package utils

import (
	"encoding/json"
	"reflect"
)

// PartialOmission represents a field that should be partially omitted
// FieldName is the name of the field to partially omit
// KeepKey is the key within that field to keep (all other keys will be removed)
type PartialOmission struct {
	FieldName string
	KeepKey   string
}

// getZeroValue returns the zero value for a given type
func getZeroValue(value interface{}) interface{} {
	if value == nil {
		return nil
	}

	// Use reflection to determine the type
	v := reflect.ValueOf(value)
	switch v.Kind() {
	case reflect.String:
		return ""
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return 0
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		return 0
	case reflect.Float32, reflect.Float64:
		return 0.0
	case reflect.Bool:
		return false
	case reflect.Map, reflect.Struct:
		return make(map[string]interface{})
	case reflect.Slice, reflect.Array:
		return []interface{}{}
	case reflect.Ptr:
		return nil
	default:
		// For unknown types, try to infer from the actual value
		switch value.(type) {
		case string:
			return ""
		case int, int8, int16, int32, int64:
			return 0
		case uint, uint8, uint16, uint32, uint64:
			return 0
		case float32, float64:
			return 0.0
		case bool:
			return false
		case map[string]interface{}:
			return make(map[string]interface{})
		case []interface{}:
			return []interface{}{}
		default:
			return nil
		}
	}
}

// PrivatizeResponse sets specified fields to their zero values in a response body and handles partial omissions
// responseBody: The response body as a map[string]interface{}
// omitFields: Array of field names to set to their zero values in the response
// partialOmissions: Array of PartialOmission structs for fields that should be partially omitted
// Returns: A new map with the specified fields set to their zero values
func PrivatizeResponse(responseBody map[string]interface{}, omitFields []string, partialOmissions []PartialOmission) map[string]interface{} {
	// Create a deep copy of the response body
	result := make(map[string]interface{})
	for k, v := range responseBody {
		result[k] = v
	}

	// Set omitted fields to their zero values
	for _, field := range omitFields {
		if originalValue, exists := result[field]; exists {
			result[field] = getZeroValue(originalValue)
		} else {
			// Field doesn't exist, set to empty map as default
			result[field] = make(map[string]interface{})
		}
	}

	// Handle partial omissions
	for _, partial := range partialOmissions {
		if fieldValue, exists := result[partial.FieldName]; exists {
			// Check if the field is a map
			if fieldMap, ok := fieldValue.(map[string]interface{}); ok {
				// Keep only the specified key
				if keepValue, keyExists := fieldMap[partial.KeepKey]; keyExists {
					result[partial.FieldName] = map[string]interface{}{
						partial.KeepKey: keepValue,
					}
				} else {
					// Key doesn't exist, set the entire field to its zero value
					if originalValue, exists := result[partial.FieldName]; exists {
						result[partial.FieldName] = getZeroValue(originalValue)
					} else {
						result[partial.FieldName] = make(map[string]interface{})
					}
				}
			}
		}
	}

	return result
}

// PrivatizeEventResponse is a convenience function that converts an Event struct to a map,
// applies privatization, and returns the result
func PrivatizeEventResponse(event interface{}, omitFields []string, partialOmissions []PartialOmission) (map[string]interface{}, error) {
	// Convert event to JSON and then to map
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return nil, err
	}

	var eventMap map[string]interface{}
	if err := json.Unmarshal(eventJSON, &eventMap); err != nil {
		return nil, err
	}

	// Apply privatization
	privatized := PrivatizeResponse(eventMap, omitFields, partialOmissions)
	return privatized, nil
}

