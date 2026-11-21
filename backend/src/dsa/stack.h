#ifndef CB_STACK_H
#define CB_STACK_H
#include <stddef.h>
#ifdef __cplusplus
extern "C" {
#endif
typedef struct CBStackNode { int value; struct CBStackNode *next; } CBStackNode;
typedef struct { CBStackNode *top; size_t size; } CBStack;
void cb_stack_init(CBStack*s); int cb_stack_push(CBStack*s,int v); int cb_stack_pop(CBStack*s,int*out); int cb_stack_peek(const CBStack*s,int*out); size_t cb_stack_display(const CBStack*s,int*out,size_t cap); void cb_stack_clear(CBStack*s);
#ifdef __cplusplus
}
#endif
#endif
