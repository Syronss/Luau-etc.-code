export interface Root {
	Classes: Class[]
	Enums: Enum[]
	Version: number
}

export interface Class {
	Members: Member[]
	MemoryCategory: string
	Name: string
	Superclass: string
	Tags?: string[]
}

export interface Member {
	Category?: string
	MemberType: string
	Name: string
	Security: any
	Serialization?: Serialization
	ThreadSafety: string
	ValueType?: ValueType
	Tags?: string[]
	Parameters?: Parameter[]
	ReturnType: any
	Capabilities: any
}

export interface Serialization {
	CanLoad: boolean
	CanSave: boolean
}

export interface ValueType {
	Category: string
	Name: string
}

export interface Parameter {
	Name: string
	Type: Type
	Default?: string
}

export interface Type {
	Category: string
	Name: string
}

export interface Enum {
	Items: Item[]
	Name: string
	Tags?: string[]
}

export interface Item {
	Name: string
	Value: number
	LegacyNames?: string[]
	Tags?: string[]
}
