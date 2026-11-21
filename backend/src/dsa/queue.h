#ifndef CB_QUEUE_H
#define CB_QUEUE_H
#include <stddef.h>
#ifdef __cplusplus
extern "C" {
#endif
typedef struct CBQueueNode { int value; struct CBQueueNode *next; } CBQueueNode;
typedef struct { CBQueueNode *front,*back; size_t size; } CBQueue;
void cb_queue_init(CBQueue *q); int cb_queue_enqueue(CBQueue*q,int v); int cb_queue_dequeue(CBQueue*q,int*out); int cb_queue_peek(const CBQueue*q,int*out); size_t cb_queue_display(const CBQueue*q,int*out,size_t cap); void cb_queue_clear(CBQueue*q);
#ifdef __cplusplus
}
#endif
#endif
