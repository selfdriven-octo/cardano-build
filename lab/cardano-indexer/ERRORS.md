2026-03-14 06:00:28 [INFO] Parsing chunk 02520.chunk...
2026-03-14 06:00:28 [WARN] Secondary index for data/_mithril_temp/immutable/02520.chunk has invalid offsets, falling back to sequential parsing
2026-03-14 06:00:28 [INFO] Chunk 02520.chunk: 170 blocks (total: 494407)
2026-03-14 06:00:28 [INFO] Parsing chunk 02521.chunk...
2026-03-14 06:00:28 [WARN] Secondary index for data/_mithril_temp/immutable/02521.chunk has invalid offsets, falling back to sequential parsing
2026-03-14 06:00:29 [INFO] Chunk 02521.chunk: 159 blocks (total: 494566)
2026-03-14 06:00:29 [INFO] Parsing chunk 02522.chunk...
2026-03-14 06:00:29 [WARN] Secondary index for data/_mithril_temp/immutable/02522.chunk has invalid offsets, falling back to sequential parsing
2026-03-14 06:00:29 [INFO] Chunk 02522.chunk: 174 blocks (total: 494740)
2026-03-14 06:00:29 [INFO] Parsing chunk 02523.chunk...
2026-03-14 06:00:29 [WARN] Secondary index for data/_mithril_temp/immutable/02523.chunk has invalid offsets, falling back to sequential parsing
2026-03-14 06:00:30 [INFO] Chunk 02523.chunk: 170 blocks (total: 494910)
2026-03-14 06:00:30 [INFO] Parsing chunk 02524.chunk...
2026-03-14 06:00:30 [WARN] Secondary index for data/_mithril_temp/immutable/02524.chunk has invalid offsets, falling back to sequential parsing

<--- Last few GCs --->

[38753:0xbfb40c000]   400723 ms: Scavenge 3981.3 (4123.8) -> 3964.2 (4130.0) MB, pooled: 0.0 MB, 6.02 / 0.03 ms (average mu = 0.348, current mu = 0.318) allocation failure; 
[38753:0xbfb40c000]   401233 ms: Mark-Compact (reduce) 4000.2 (4143.0) -> 3900.6 (4077.2) MB, pooled: 0.0 MB, 27.55 / 0.09 ms (+ 364.4 ms in 76 steps since start of marking, biggest step 5.5 ms, walltime since start of marking 443 ms) (average mu = 0.377,
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
----- Native stack trace -----

 1: 0x1005bee88 node::OOMErrorHandler(char const*, v8::OOMDetails const&) [/usr/local/bin/node]
 2: 0x1007d9ff4 v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, v8::OOMDetails const&) [/usr/local/bin/node]
 3: 0x100a26d4c v8::internal::Heap::stack() [/usr/local/bin/node]
 4: 0x100a2a278 v8::internal::Heap::HasLowYoungGenerationAllocationRate() [/usr/local/bin/node]
 5: 0x100a3c508 v8::internal::Heap::CollectGarbage(v8::internal::AllocationSpace, v8::internal::GarbageCollectionReason, v8::GCCallbackFlags, v8::internal::PerformHeapLimitCheck)::$_1::operator()() const [/usr/local/bin/node]
 6: 0x100a3bdcc void heap::base::Stack::SetMarkerAndCallbackImpl<v8::internal::Heap::CollectGarbage(v8::internal::AllocationSpace, v8::internal::GarbageCollectionReason, v8::GCCallbackFlags, v8::internal::PerformHeapLimitCheck)::$_1>(heap::base::Stack*, void*, void const*) [/usr/local/bin/node]
 7: 0x101385b30 PushAllRegistersAndIterateStack [/usr/local/bin/node]
 8: 0x100a24b00 v8::internal::Heap::CollectGarbage(v8::internal::AllocationSpace, v8::internal::GarbageCollectionReason, v8::GCCallbackFlags, v8::internal::PerformHeapLimitCheck) [/usr/local/bin/node]
 9: 0x10098736c v8::internal::StackGuard::HandleInterrupts(v8::internal::StackGuard::InterruptLevel) [/usr/local/bin/node]
10: 0x100e55ce8 v8::internal::Runtime_StackGuard(int, unsigned long*, v8::internal::Isolate*) [/usr/local/bin/node]
11: 0x101475474 Builtins_CEntry_Return1_ArgvOnStack_NoBuiltinExit [/usr/local/bin/node]
12: 0x10143c854 Builtins_MapPrototypeSet [/usr/local/bin/node]
13: 0x12d64a470 
14: 0x12d6758f0 
15: 0x12d7839e0 
16: 0x12d763d28 
17: 0x12d77bc40 
18: 0x1013d55ec Builtins_InterpreterEntryTrampoline [/usr/local/bin/node]
19: 0x1014134c4 Builtins_AsyncFunctionAwaitResolveClosure [/usr/local/bin/node]
20: 0x1014ea058 Builtins_PromiseFulfillReactionJob [/usr/local/bin/node]
21: 0x101402920 Builtins_RunMicrotasks [/usr/local/bin/node]
22: 0x1013d2850 Builtins_JSRunMicrotasksEntry [/usr/local/bin/node]
23: 0x10095694c v8::internal::(anonymous namespace)::Invoke(v8::internal::Isolate*, v8::internal::(anonymous namespace)::InvokeParams const&) [/usr/local/bin/node]
24: 0x1009571e8 v8::internal::(anonymous namespace)::InvokeWithTryCatch(v8::internal::Isolate*, v8::internal::(anonymous namespace)::InvokeParams const&) [/usr/local/bin/node]
25: 0x10095730c v8::internal::Execution::TryRunMicrotasks(v8::internal::Isolate*, v8::internal::MicrotaskQueue*) [/usr/local/bin/node]
26: 0x10286c830 v8::internal::MicrotaskQueue::RunMicrotasks(v8::internal::Isolate*) [/usr/local/bin/node]
27: 0x10286cb78 v8::internal::MicrotaskQueue::PerformCheckpoint(v8::Isolate*) (.cold.1) [/usr/local/bin/node]
28: 0x100985e90 v8::internal::MicrotaskQueue::PerformCheckpoint(v8::Isolate*) [/usr/local/bin/node]
29: 0x1013d73cc Builtins_CallApiCallbackOptimizedNoProfiling [/usr/local/bin/node]
30: 0x12d72e9e0 
31: 0x1013d296c Builtins_JSEntryTrampoline [/usr/local/bin/node]
32: 0x1013d2610 Builtins_JSEntry [/usr/local/bin/node]
33: 0x100956994 v8::internal::(anonymous namespace)::Invoke(v8::internal::Isolate*, v8::internal::(anonymous namespace)::InvokeParams const&) [/usr/local/bin/node]
34: 0x100956318 v8::internal::Execution::Call(v8::internal::Isolate*, v8::internal::DirectHandle<v8::internal::Object>, v8::internal::DirectHandle<v8::internal::Object>, v8::base::Vector<v8::internal::DirectHandle<v8::internal::Object> const>) [/usr/local/bin/node]
35: 0x1007eb4d4 v8::Function::Call(v8::Isolate*, v8::Local<v8::Context>, v8::Local<v8::Value>, int, v8::Local<v8::Value>*) [/usr/local/bin/node]
36: 0x1004cb094 node::InternalCallbackScope::Close() [/usr/local/bin/node]
37: 0x1004cb30c node::InternalMakeCallback(node::Environment*, v8::Local<v8::Object>, v8::Local<v8::Object>, v8::Local<v8::Function>, int, v8::Local<v8::Value>*, node::async_context, v8::Local<v8::Value>) [/usr/local/bin/node]
38: 0x1004de904 node::AsyncWrap::MakeCallback(v8::Local<v8::Function>, int, v8::Local<v8::Value>*) [/usr/local/bin/node]
39: 0x1006ea1b4 node::(anonymous namespace)::ProcessWrap::OnExit(uv_process_s*, long long, int) [/usr/local/bin/node]
40: 0x1013bbc70 uv__wait_children [/usr/local/bin/node]
41: 0x1013c7518 uv__io_poll [/usr/local/bin/node]
42: 0x1013b36d0 uv_run [/usr/local/bin/node]
43: 0x1004cc53c node::SpinEventLoopInternal(node::Environment*) [/usr/local/bin/node]
44: 0x1027cf6e4 node::NodeMainInstance::Run() (.cold.1) [/usr/local/bin/node]
45: 0x1006028c4 node::NodeMainInstance::Run() [/usr/local/bin/node]
46: 0x10057d34c node::Start(int, char**) [/usr/local/bin/node]
47: 0x1942a9d54 start [/usr/lib/dyld]
zsh: abort      node dist/main.js --bootstrap
selfdriven@Marks-Mac-mini cardano-indexer % 